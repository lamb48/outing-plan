import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/ratelimit";
import { getPlacePhotoUrl } from "@/lib/google-places-photos";

/**
 * GET /api/plan/history
 * プラン履歴取得API
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // レート制限チェック
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(
      `plan-history:${clientIp}`,
      RATE_LIMITS.PLAN_READ.limit,
      RATE_LIMITS.PLAN_READ.windowMs,
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "リクエストが多すぎます。しばらく待ってから再試行してください。",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rateLimitResult.reset / 1000)),
          },
        },
      );
    }

    // クエリパラメータ
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // プラン一覧取得（RLSにより自動的に自分のプランのみ）
    const {
      data: plans,
      error,
      count,
    } = await supabase
      .from("plans")
      .select(
        "id, title, budget, categories, duration_hours, area_lat, area_lng, spots, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      plans: (plans || []).map((plan) => {
        const spots = Array.isArray(plan.spots)
          ? (plan.spots as Array<{ photoReference?: string }>)
          : [];
        // 画像を持つスポットから最大6件の画像URLを取得
        const thumbnailUrls = spots
          .filter((spot) => spot.photoReference)
          .slice(0, 6)
          .map((spot) => getPlacePhotoUrl(spot.photoReference!, 400));

        return {
          id: plan.id,
          title: plan.title,
          budget: plan.budget,
          categories: plan.categories,
          durationHours: plan.duration_hours,
          areaLat: plan.area_lat,
          areaLng: plan.area_lng,
          spotsCount: spots.length,
          thumbnailUrls,
          createdAt: plan.created_at,
        };
      }),
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching plan history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch plan history",
        message: "プラン履歴の取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

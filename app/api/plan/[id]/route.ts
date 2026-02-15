import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/ratelimit";

/**
 * GET /api/plan/[id]
 * プラン詳細取得API
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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
      `plan-read:${clientIp}`,
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

    // プラン取得（RLSにより自動的に所有権チェック）
    const { data: plan, error } = await supabase
      .from("plans")
      .select(
        `
        id,
        title,
        budget,
        categories,
        duration_hours,
        area_lat,
        area_lng,
        spots,
        created_at,
        user_id,
        users (
          id,
          email,
          display_name,
          avatar_url
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        title: plan.title,
        budget: plan.budget,
        categories: plan.categories,
        durationHours: plan.duration_hours,
        areaLat: plan.area_lat,
        areaLng: plan.area_lng,
        spots: plan.spots,
        createdAt: plan.created_at,
        user: Array.isArray(plan.users) ? plan.users[0] : plan.users,
      },
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    const isDevelopment = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Failed to fetch plan",
        message: isDevelopment
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : "プランの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

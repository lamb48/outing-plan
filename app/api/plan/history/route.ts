import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // クエリパラメータ
    const searchParams = request.nextUrl.searchParams;
    const rawLimit = parseInt(searchParams.get("limit") || "20");
    const rawOffset = parseInt(searchParams.get("offset") || "0");
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 50);
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

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
          ? (plan.spots as Array<{
              placeId: string;
              name: string;
              address: string;
              lat: number;
              lng: number;
              category: string;
              rating?: number;
              photoReference?: string;
              estimatedDuration: number;
              estimatedCost: number;
              order: number;
              arrivalTime: string;
              departureTime: string;
            }>)
          : [];
        // 画像を持つスポットから最大6件の画像URLを取得
        const thumbnailUrls = spots
          .filter((spot) => spot.photoReference)
          .slice(0, 6)
          .map((spot) => getPlacePhotoUrl(spot.photoReference!, 400));

        // rating の平均を計算
        const ratingsWithValue = spots
          .filter((spot) => spot.rating !== undefined && spot.rating !== null)
          .map((spot) => spot.rating!);
        const averageRating =
          ratingsWithValue.length > 0
            ? ratingsWithValue.reduce((sum, rating) => sum + rating, 0) / ratingsWithValue.length
            : undefined;

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
          averageRating,
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

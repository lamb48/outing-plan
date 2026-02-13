import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        "id, title, budget, category, duration_hours, area_lat, area_lng, spots, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      plans: (plans || []).map((plan) => ({
        id: plan.id,
        title: plan.title,
        budget: plan.budget,
        category: plan.category,
        durationHours: plan.duration_hours,
        areaLat: plan.area_lat,
        areaLng: plan.area_lng,
        spotsCount: Array.isArray(plan.spots) ? plan.spots.length : 0,
        createdAt: plan.created_at,
      })),
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
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

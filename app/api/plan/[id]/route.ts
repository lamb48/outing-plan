import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // プラン取得（RLSにより自動的に所有権チェック）
    const { data: plan, error } = await supabase
      .from("plans")
      .select(
        `
        id,
        title,
        budget,
        category,
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
        category: plan.category,
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
    return NextResponse.json(
      {
        error: "Failed to fetch plan",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateOutingPlan } from "@/lib/mastra/agent";
import { flushLangfuse } from "@/lib/langfuse";
import { mapCategoryToPlacesType } from "@/lib/categories";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/ratelimit";

/**
 * プラン生成リクエストのバリデーションスキーマ
 */
const generatePlanSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().optional(),
  budget: z.number().min(0).max(1000000),
  categories: z.array(z.string()).min(1).max(8),
  durationHours: z.number().min(0.5).max(24),
  startTime: z.string().optional(),
});

function parseRetryAfterSeconds(message: string): number | null {
  const match = message.match(/retry in\s+([\d.]+)s/i);
  if (!match) return null;
  const seconds = Math.ceil(Number(match[1]));
  return Number.isFinite(seconds) ? seconds : null;
}

/**
 * POST /api/plan/generate
 * AIプラン生成API
 */
export async function POST(request: NextRequest) {
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
      `plan-generate:${clientIp}`,
      RATE_LIMITS.PLAN_GENERATE.limit,
      RATE_LIMITS.PLAN_GENERATE.windowMs,
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

    // リクエストボディのパース
    const body = await request.json();

    // バリデーション
    const validationResult = generatePlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const params = validationResult.data;

    // カテゴリをGoogle Places APIのタイプに変換
    const placesTypes = params.categories.map((cat) => mapCategoryToPlacesType(cat));

    // AIプラン生成
    const plan = await generateOutingPlan({
      ...params,
      categories: placesTypes,
      userId: user.id,
    });

    const { data: savedPlan, error: insertPlanError } = await supabase
      .from("plans")
      .insert({
        user_id: user.id,
        title: plan.title,
        budget: params.budget,
        categories: params.categories,
        duration_hours: params.durationHours,
        area_lat: params.latitude,
        area_lng: params.longitude,
        spots: plan.spots,
      })
      .select()
      .single();

    if (insertPlanError || !savedPlan) {
      throw new Error(`プランの保存に失敗しました: ${insertPlanError?.message}`);
    }

    // Langfuseバッファをフラッシュ
    await flushLangfuse();

    return NextResponse.json({
      success: true,
      plan: {
        id: savedPlan.id,
        title: savedPlan.title,
        budget: savedPlan.budget,
        categories: savedPlan.categories,
        durationHours: savedPlan.duration_hours,
        totalCost: plan.totalCost,
        totalDuration: plan.totalDuration,
        spots: plan.spots,
        createdAt: savedPlan.created_at,
      },
    });
  } catch (error) {
    console.error("Error generating plan:", error);

    await flushLangfuse();

    const message = error instanceof Error ? error.message : "Unknown error";
    const isQuotaExceeded = /quota exceeded|rate limit|free_tier_requests/i.test(message);
    const retryAfterSeconds = parseRetryAfterSeconds(message);

    if (isQuotaExceeded) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Gemini APIの利用上限に達しました。しばらく待ってから再試行してください。",
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate plan",
        message: "プランの生成に失敗しました",
      },
      { status: 500 },
    );
  }
}

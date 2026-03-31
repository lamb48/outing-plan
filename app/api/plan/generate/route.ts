import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateOutingPlan, type PlanProgress } from "@/lib/mastra/agent";
import { flushLangfuse } from "@/lib/langfuse";
import { mapCategoryToPlacesType } from "@/lib/categories";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit-supabase";

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
 * SSE イベントをエンコードするヘルパー
 */
function encodeSSE(data: unknown): Uint8Array {
  const json = JSON.stringify(data);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

/**
 * POST /api/plan/generate
 * AIプラン生成API（SSEストリーミング対応）
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // レート制限チェック
  const rateLimitResult = await rateLimit(
    `plan-generate:${user.id}`,
    RATE_LIMITS.PLAN_GENERATE.limit,
    RATE_LIMITS.PLAN_GENERATE.windowMs,
  );

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "リクエストが多すぎます。しばらく待ってから再試行してください。",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rateLimitResult.reset / 1000)),
        },
      },
    );
  }

  // リクエストボディのパース + バリデーション
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validationResult = generatePlanSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details:
          process.env.NODE_ENV === "development"
            ? validationResult.error.errors
            : validationResult.error.errors.map((e) => ({ path: e.path, message: e.message })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const params = validationResult.data;
  const placesTypes = params.categories.map((cat) => mapCategoryToPlacesType(cat));

  // SSE ストリームを生成
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encodeSSE(data));
        } catch {
          // クライアントが切断済みの場合は無視
        }
      };

      const onProgress = (progress: PlanProgress) => {
        send({ status: progress.status, message: progress.message });
      };

      try {
        const plan = await generateOutingPlan(
          {
            ...params,
            categories: placesTypes,
            userId: user.id,
            sessionId: user.id,
          },
          onProgress,
        );

        // Supabase に保存
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

        send({
          status: "done",
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

        const message = error instanceof Error ? error.message : "Unknown error";
        const isQuotaExceeded = /quota exceeded|rate limit|free_tier_requests/i.test(message);
        const retryAfterSeconds = parseRetryAfterSeconds(message);

        if (isQuotaExceeded) {
          send({
            status: "error",
            error: "Rate limit exceeded",
            message: "Gemini APIの利用上限に達しました。しばらく待ってから再試行してください。",
            retryAfterSeconds,
          });
        } else {
          send({
            status: "error",
            error: "Failed to generate plan",
            message:
              process.env.NODE_ENV === "development"
                ? message
                : "プランの生成に失敗しました。しばらく経ってから再試行してください。",
          });
        }
      } finally {
        await flushLangfuse();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

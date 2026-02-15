import { outingPlanAgent, planStructuringAgent } from "./agent-instances";
import { type GeneratePlanParams, type GeneratedPlan, generatedPlanSchema } from "./schemas";
import { extractDraftText } from "./response-extractor";
import { createStructuringPrompt } from "./structuring-prompt";
import { createUserPrompt } from "./prompts";
import { createTrace } from "../langfuse";

// 後方互換性のため型を re-export
export type { GeneratePlanParams, GeneratedPlan };

/**
 * おでかけプランを生成（Langfuseトレーシング付き）
 */
export async function generateOutingPlan(params: GeneratePlanParams): Promise<GeneratedPlan> {
  const startTime = Date.now();
  const userPrompt = createUserPrompt(params);

  const trace = createTrace({
    name: "generate-outing-plan",
    userId: params.userId,
    input: {
      params,
      userPrompt,
    },
    metadata: {
      latitude: params.latitude,
      longitude: params.longitude,
      locationName: params.locationName,
      budget: params.budget,
      categories: params.categories,
      durationHours: params.durationHours,
    },
  });

  try {
    // 1段階目: ツールを使って下書きを生成
    const draftResponse = await outingPlanAgent.generate(userPrompt, {
      maxSteps: 6,
    });

    const draftText = extractDraftText(draftResponse);
    if (!draftText) {
      throw new Error("Failed to extract draft text from tool execution result");
    }

    // 2段階目: ツール無しで構造化
    const structuringPrompt = createStructuringPrompt(userPrompt, draftText);
    const structuredResponse = await planStructuringAgent.generate<GeneratedPlan>(
      structuringPrompt,
      {
        maxSteps: 1,
        structuredOutput: {
          schema: generatedPlanSchema,
          errorStrategy: "strict",
          jsonPromptInjection: true,
        },
      },
    );

    if (!structuredResponse.object) {
      throw new Error("Structured output is missing from second-stage response");
    }

    const plan = generatedPlanSchema.parse(structuredResponse.object);

    if (trace) {
      trace.update({
        output: plan,
        metadata: {
          duration: Date.now() - startTime,
          spotsCount: plan.spots.length,
          totalCost: plan.totalCost,
          twoPhase: true,
          draftTextLength: draftText.length,
        },
      });
    }

    return plan;
  } catch (error) {
    if (trace) {
      trace.update({
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
          duration: Date.now() - startTime,
        },
      });
    }

    console.error("[ERROR] Error generating plan:", error);

    // Zodエラーの場合はシンプルなメッセージのみ投げる
    if (error && typeof error === "object" && "errors" in error) {
      throw new Error("プラン生成に失敗しました。もう一度お試しください。");
    }

    throw new Error(
      error instanceof Error
        ? `プラン生成に失敗しました: ${error.message}`
        : "プラン生成に失敗しました",
    );
  }
}

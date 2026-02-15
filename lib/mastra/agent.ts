import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { searchNearbyPlacesTool, calculateDistanceTool } from "./tools";
import { PLAN_GENERATION_PROMPT, createUserPrompt } from "./prompts";
import { createTrace } from "../langfuse";

/**
 * おでかけプラン生成エージェント
 */
export const outingPlanAgent = new Agent({
  id: "outing-plan-agent",
  name: "Outing Plan Agent",
  instructions: PLAN_GENERATION_PROMPT,
  model: "google/gemini-2.5-flash-lite",
  tools: {
    searchNearbyPlacesTool,
    calculateDistanceTool,
  },
});

const planStructuringAgent = new Agent({
  id: "outing-plan-structuring-agent",
  name: "Outing Plan Structuring Agent",
  instructions:
    "あなたはJSON構造化アシスタントです。与えられた下書きを、指定スキーマに厳密に合わせたJSONオブジェクトへ変換してください。",
  model: "google/gemini-2.5-flash-lite",
});

/**
 * プラン生成パラメータ
 */
export interface GeneratePlanParams {
  latitude: number;
  longitude: number;
  locationName?: string;
  budget: number;
  categories: string[];
  durationHours: number;
  startTime?: string;
  userId?: string;
}

/**
 * プラン生成結果
 */
export interface GeneratedPlan {
  title: string;
  totalCost: number;
  totalDuration: number;
  spots: Array<{
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
  }>;
}

const generatedPlanSchema = z.object({
  title: z.string(),
  totalCost: z.coerce.number().finite().nonnegative(),
  totalDuration: z.coerce.number().finite().nonnegative(),
  spots: z.array(
    z.object({
      placeId: z.string(),
      name: z.string(),
      address: z.string(),
      lat: z.coerce.number().finite().min(-90).max(90),
      lng: z.coerce.number().finite().min(-180).max(180),
      category: z.string(),
      rating: z.coerce.number().finite().min(0).max(5).optional(),
      photoReference: z.string().optional(),
      estimatedDuration: z.coerce.number().finite().nonnegative(),
      estimatedCost: z.coerce.number().finite().nonnegative(),
      order: z.coerce.number().finite().int().positive(),
      arrivalTime: z.string(),
      departureTime: z.string(),
    }),
  ),
});

function getStepText(step: unknown): string {
  if (!step || typeof step !== "object") {
    return "";
  }

  const stepRecord = step as Record<string, unknown>;
  if (typeof stepRecord.text === "string" && stepRecord.text.trim()) {
    return stepRecord.text.trim();
  }

  const content = stepRecord.content;
  if (!Array.isArray(content)) {
    return "";
  }

  for (let i = content.length - 1; i >= 0; i--) {
    const item = content[i];
    if (!item || typeof item !== "object") {
      continue;
    }

    const contentItem = item as Record<string, unknown>;
    if (contentItem.type === "text" && typeof contentItem.text === "string") {
      const text = contentItem.text.trim();
      if (text) {
        return text;
      }
    }
  }

  return "";
}

function unknownToText(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== "{}" && serialized !== "[]" ? serialized : "";
  } catch {
    return "";
  }
}

function extractDraftText(response: unknown): string {
  if (!response || typeof response !== "object") {
    return "";
  }

  const responseRecord = response as Record<string, unknown>;
  const candidates: string[] = [];

  if (typeof responseRecord.text === "string" && responseRecord.text.trim()) {
    candidates.push(responseRecord.text.trim());
  }

  const objectText = unknownToText(responseRecord.object);
  if (objectText) {
    candidates.push(objectText);
  }

  const steps = responseRecord.steps;
  if (Array.isArray(steps)) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const stepText = getStepText(steps[i]);
      if (stepText) {
        candidates.push(stepText);
      }

      const step = steps[i];
      if (!step || typeof step !== "object") {
        continue;
      }

      const content = (step as Record<string, unknown>).content;
      if (!Array.isArray(content)) {
        continue;
      }

      for (let j = content.length - 1; j >= 0; j--) {
        const item = content[j];
        if (!item || typeof item !== "object") {
          continue;
        }

        const record = item as Record<string, unknown>;
        if (record.type === "tool-result") {
          const outputText = unknownToText(record.output);
          if (outputText) {
            candidates.push(outputText);
          }
        }
      }
    }
  }

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  const rawResponseText = unknownToText(response);
  if (rawResponseText) {
    return rawResponseText;
  }

  return "";
}

function createStructuringPrompt(basePrompt: string, draftText: string): string {
  const truncatedDraft = draftText.slice(0, 12000);

  return `あなたはおでかけプランの構造化担当です。以下の内容をもとに、指定スキーマに厳密に従うJSONオブジェクトを生成してください。

## 元の依頼
${basePrompt}

## 下書き（ツール実行結果を含む）
${truncatedDraft}

## 厳守事項
- スキーマにないキーを出力しない
- 数値項目は必ず数値で出力する
- spotsは配列で返す
- 回答はJSONオブジェクトのみ`;
}

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

    if (process.env.NODE_ENV !== "production") {
      console.log("[DEBUG] Draft response keys:", Object.keys(draftResponse as object));
      console.log("[DEBUG] Draft text length:", draftText.length);
      console.log("[DEBUG] Structured response keys:", Object.keys(structuredResponse));
      console.log("[DEBUG] Structured response.object:", structuredResponse.object);
    }

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

    // Zodエラーの場合は詳細をログに出力（ユーザーには見せない）
    if (error && typeof error === "object" && "errors" in error) {
      console.error("[ERROR] Zod validation errors:", JSON.stringify(error.errors, null, 2));
      // Zodエラーの場合はシンプルなメッセージのみ投げる
      throw new Error("プラン生成に失敗しました。もう一度お試しください。");
    }

    throw new Error(
      error instanceof Error
        ? `プラン生成に失敗しました: ${error.message}`
        : "プラン生成に失敗しました",
    );
  }
}

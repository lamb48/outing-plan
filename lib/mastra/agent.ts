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
  totalCost: z.coerce.number(),
  totalDuration: z.coerce.number(),
  spots: z.array(
    z.object({
      placeId: z.string(),
      name: z.string(),
      address: z.string(),
      lat: z.coerce.number(),
      lng: z.coerce.number(),
      category: z.string(),
      rating: z.coerce.number().optional(),
      photoReference: z.string().optional(),
      estimatedDuration: z.coerce.number(),
      estimatedCost: z.coerce.number(),
      order: z.coerce.number(),
      arrivalTime: z.string(),
      departureTime: z.string(),
    }),
  ),
});

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parsePlanFromResponseText(text: string): GeneratedPlan {
  const normalized = text.trim().replace(/^\uFEFF/, "");

  const direct = tryParseJson<GeneratedPlan>(normalized);
  if (direct) {
    return direct;
  }

  const fencedBlocks = normalized.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
  for (const block of fencedBlocks) {
    const parsed = tryParseJson<GeneratedPlan>(block[1]);
    if (parsed) {
      return parsed;
    }
  }

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    const jsonLike = normalized.slice(firstBrace, lastBrace + 1);
    const parsed = tryParseJson<GeneratedPlan>(jsonLike);
    if (parsed) {
      return parsed;
    }
  }

  const preview = normalized.slice(0, 300);
  throw new Error(`Failed to parse plan JSON from response: ${preview}`);
}

function isPlanLikeObject(value: unknown): value is GeneratedPlan {
  return generatedPlanSchema.safeParse(value).success;
}

function extractPlanCandidateFromUnknown(input: unknown, depth = 0): string {
  if (depth > 8 || input == null) {
    return "";
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("{") || trimmed.includes("```")) {
      return trimmed;
    }
    return "";
  }

  if (typeof input !== "object") {
    return "";
  }

  if (isPlanLikeObject(input)) {
    return JSON.stringify(input);
  }

  const priorityKeys = [
    "text",
    "outputText",
    "output",
    "object",
    "result",
    "content",
    "response",
    "message",
    "data",
    "payload",
    "value",
  ];

  const obj = input as Record<string, unknown>;
  for (const key of priorityKeys) {
    if (key in obj) {
      const extracted = extractPlanCandidateFromUnknown(obj[key], depth + 1);
      if (extracted) return extracted;
    }
  }

  if (Array.isArray(input)) {
    for (let i = input.length - 1; i >= 0; i--) {
      const extracted = extractPlanCandidateFromUnknown(input[i], depth + 1);
      if (extracted) return extracted;
    }
    return "";
  }

  for (const key of Object.keys(obj)) {
    const extracted = extractPlanCandidateFromUnknown(obj[key], depth + 1);
    if (extracted) return extracted;
  }

  return "";
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
    const response = await outingPlanAgent.generate(userPrompt, {
      maxSteps: 6,
    });

    const responseText =
      extractPlanCandidateFromUnknown(response.text) ||
      extractPlanCandidateFromUnknown(response.object) ||
      extractPlanCandidateFromUnknown(response) ||
      extractPlanCandidateFromUnknown(response.steps);

    if (!responseText) {
      throw new Error("Failed to extract response text from steps");
    }

    const plan = generatedPlanSchema.parse(parsePlanFromResponseText(responseText));

    if (trace) {
      trace.update({
        output: plan,
        metadata: {
          duration: Date.now() - startTime,
          spotsCount: plan.spots.length,
          totalCost: plan.totalCost,
          responseLength: responseText.length,
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

    console.error("Error generating plan:", error);
    throw new Error(
      error instanceof Error
        ? `プラン生成に失敗しました: ${error.message}`
        : "プラン生成に失敗しました",
    );
  }
}

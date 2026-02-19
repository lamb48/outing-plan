/**
 * プラン組み立て（非LLM）
 *
 * - Alias Registry から実 placeId・photoReference を取得
 * - タイミングエージェントとコストエージェントの結果を合成
 * - LLMは一切関与しない（placeId/photoReference のハルシネーションが不可能）
 */

import { type AliasRegistry } from "./data-collectors/places-collector";
import { type GeneratedPlan, generatedPlanSchema } from "./schemas";

export interface TimingResult {
  arrivalTime: string;
  departureTime: string;
  estimatedDuration: number;
}

export interface CostResult {
  estimatedCost: number;
}

export function assemblePlan(params: {
  title: string;
  selectedAliases: string[];
  registry: AliasRegistry;
  timing: Record<string, TimingResult>;
  cost: Record<string, CostResult>;
}): GeneratedPlan {
  const { title, selectedAliases, registry, timing, cost } = params;

  const spots = selectedAliases
    .filter((alias) => {
      if (!registry[alias]) {
        console.warn(`[plan-assembler] Unknown alias "${alias}" — skipping`);
        return false;
      }
      if (!timing[alias]) {
        console.warn(`[plan-assembler] No timing for alias "${alias}" — skipping`);
        return false;
      }
      return true;
    })
    .map((alias, index) => {
      const place = registry[alias];
      const t = timing[alias];
      const estimatedCost = cost[alias]?.estimatedCost ?? 0;

      return {
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        category: place.category,
        rating: place.rating,
        // photoReference は alias registry から取得 — LLMは触らない
        ...(place.photoReference ? { photoReference: place.photoReference } : {}),
        estimatedDuration: t.estimatedDuration,
        estimatedCost,
        order: index + 1,
        arrivalTime: t.arrivalTime,
        departureTime: t.departureTime,
      };
    });

  const plan = {
    title,
    totalCost: spots.reduce((sum, sp) => sum + sp.estimatedCost, 0),
    totalDuration: spots.reduce((sum, sp) => sum + sp.estimatedDuration, 0),
    spots,
  };

  // Zod でスキーマ検証
  return generatedPlanSchema.parse(plan);
}

/**
 * タイミングエージェントのJSON出力をパース
 */
export function parseTimingResponse(text: string): Record<string, TimingResult> {
  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json);

    const result: Record<string, TimingResult> = {};
    for (const [alias, value] of Object.entries(parsed)) {
      const v = value as Record<string, unknown>;
      if (
        typeof v.arrivalTime === "string" &&
        typeof v.departureTime === "string" &&
        typeof v.estimatedDuration === "number"
      ) {
        result[alias] = {
          arrivalTime: v.arrivalTime,
          departureTime: v.departureTime,
          estimatedDuration: v.estimatedDuration,
        };
      }
    }
    return result;
  } catch (err) {
    throw new Error(
      `[parseTimingResponse] JSON parse failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}

/**
 * コストエージェントのJSON出力をパース
 */
export function parseCostResponse(text: string): Record<string, CostResult> {
  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json);

    const result: Record<string, CostResult> = {};
    for (const [alias, value] of Object.entries(parsed)) {
      const v = value as Record<string, unknown>;
      const cost = Number(v.estimatedCost);
      if (Number.isFinite(cost)) {
        result[alias] = { estimatedCost: cost };
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * スポット選定エージェントのJSON出力をパース
 */
export function parseSelectionResponse(text: string): {
  selectedAliases: string[];
} {
  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json);

    const selectedAliases = Array.isArray(parsed.selectedAliases)
      ? parsed.selectedAliases.filter((a: unknown) => typeof a === "string")
      : [];

    return { selectedAliases };
  } catch {
    return { selectedAliases: [] };
  }
}

/**
 * タイトル生成エージェントのJSON出力をパース
 */
export function parseTitleResponse(text: string): string {
  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json);
    return typeof parsed.title === "string" ? parsed.title : "おでかけプラン";
  } catch {
    return "おでかけプラン";
  }
}

/** テキストから JSON ブロックを抽出（コードフェンス対応） */
function extractJson(text: string): string {
  // ```json ... ``` or ``` ... ``` のフェンスを除去
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // { ... } の範囲を探す
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

/**
 * おでかけプラン生成オーケストレーター
 *
 * フェーズ構成:
 * 0. 開始時刻決定（コード）
 * 1. 並列データ収集（Google Places × N カテゴリ + Open-Meteo 天気）
 * 2a. スポット選定エージェント（LLM・ツールなし・alias のみ）
 * 2b. タイミング + コスト エージェント（並列実行）
 * 3. コード組み立て + Zod 検証
 */

import { type GeneratePlanParams, type GeneratedPlan } from "./schemas";
import { collectAllData } from "./data-collectors/index";
import { formatAliasListForLLM } from "./data-collectors/places-collector";
import { spotSelectionAgent } from "./agents/spot-selection-agent";
import { timingAgent } from "./agents/timing-agent";
import { costAgent } from "./agents/cost-agent";
import { createSpotSelectionPrompt } from "./prompts/spot-selection-prompt";
import { createTimingPrompt } from "./prompts/timing-prompt";
import { createCostPrompt } from "./prompts/cost-prompt";
import {
  assemblePlan,
  parseSelectionResponse,
  parseTimingResponse,
  parseCostResponse,
} from "./plan-assembler";
import { determineStartTime } from "./start-time";
import { createTrace } from "../langfuse";

export type { GeneratePlanParams, GeneratedPlan };

export type PlanProgressStatus =
  | "collecting"
  | "selecting"
  | "timing"
  | "assembling"
  | "done"
  | "error";

export interface PlanProgress {
  status: PlanProgressStatus;
  message: string;
}

export type ProgressCallback = (progress: PlanProgress) => void;

/**
 * おでかけプランを生成（Langfuseトレーシング付き）
 */
export async function generateOutingPlan(
  params: GeneratePlanParams,
  onProgress?: ProgressCallback,
): Promise<GeneratedPlan> {
  const startTime = Date.now();

  const trace = createTrace({
    name: "generate-outing-plan",
    userId: params.userId,
    input: { params },
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
    // --- Phase 0: 開始時刻決定 ---
    const planStartTime = determineStartTime({
      locationName: params.locationName,
      categories: params.categories,
      startTime: params.startTime,
    });

    // --- Phase 1: 並列データ収集 ---
    onProgress?.({ status: "collecting", message: "スポットを検索中..." });

    const collected = await collectAllData({
      latitude: params.latitude,
      longitude: params.longitude,
      locationName: params.locationName,
      categories: params.categories,
    });

    const totalCandidates = Object.values(collected.placesByCategory).reduce(
      (sum, places) => sum + places.length,
      0,
    );

    if (totalCandidates === 0) {
      throw new Error("指定エリアでスポットが見つかりませんでした。エリアを変更してください。");
    }

    // --- Phase 2a: スポット選定 ---
    onProgress?.({ status: "selecting", message: "最適なスポットを選定中..." });

    const aliasListText = formatAliasListForLLM(collected.aliasRegistry);
    const selectionPrompt = createSpotSelectionPrompt({
      aliasListText,
      budget: params.budget,
      durationHours: params.durationHours,
      categories: params.categories,
      startTime: planStartTime,
      weather: collected.weather,
      trends: collected.trends,
    });

    const selectionResponse = await spotSelectionAgent.generate(selectionPrompt, {
      maxSteps: 1,
    });

    const { title, selectedAliases } = parseSelectionResponse(selectionResponse.text ?? "");

    if (selectedAliases.length === 0) {
      throw new Error("スポット選定に失敗しました。もう一度お試しください。");
    }

    // 選定された alias が registry に存在するか確認
    const validAliases = selectedAliases.filter((alias) => collected.aliasRegistry[alias]);
    if (validAliases.length === 0) {
      throw new Error("選定されたスポットが候補リストに存在しません。もう一度お試しください。");
    }

    // --- Phase 2b: タイミング + コスト（並列） ---
    onProgress?.({ status: "timing", message: "ルートと時間・費用を計算中..." });

    const timingPrompt = createTimingPrompt({
      selectedAliases: validAliases,
      registry: collected.aliasRegistry,
      startTime: planStartTime,
      durationHours: params.durationHours,
    });

    const costPrompt = createCostPrompt({
      selectedAliases: validAliases,
      registry: collected.aliasRegistry,
      budget: params.budget,
    });

    const [timingResponse, costResponse] = await Promise.all([
      timingAgent.generate(timingPrompt, { maxSteps: 4 }),
      costAgent.generate(costPrompt, { maxSteps: 1 }),
    ]);

    const timing = parseTimingResponse(timingResponse.text ?? "");
    const cost = parseCostResponse(costResponse.text ?? "");

    // --- Phase 3: コード組み立て + Zod 検証 ---
    onProgress?.({ status: "assembling", message: "プランを整理中..." });

    const plan = assemblePlan({
      title,
      selectedAliases: validAliases,
      registry: collected.aliasRegistry,
      timing,
      cost,
    });

    if (trace) {
      trace.update({
        output: plan,
        metadata: {
          duration: Date.now() - startTime,
          dataCollectionMs: collected.collectionDurationMs,
          hasWeather: !!collected.weather,
          categoriesCount: params.categories.length,
          totalCandidates,
          selectedCount: validAliases.length,
          spotsCount: plan.spots.length,
          totalCost: plan.totalCost,
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

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
import { createTitlePrompt } from "./prompts/title-prompt";
import {
  assemblePlan,
  parseSelectionResponse,
  parseTimingResponse,
  parseCostResponse,
  parseTitleResponse,
} from "./plan-assembler";
import { determineStartTime } from "./start-time";
import { createTrace, addTraceScore } from "../langfuse";

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
    sessionId: params.sessionId,
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
    const phase0Span = trace?.span({
      name: "phase-0-start-time",
      input: { locationName: params.locationName, categories: params.categories },
    });

    const planStartTime = determineStartTime({
      locationName: params.locationName,
      categories: params.categories,
      startTime: params.startTime,
    });

    phase0Span?.end({ output: { planStartTime } });

    // --- Phase 1: 並列データ収集 ---
    onProgress?.({ status: "collecting", message: "スポットを検索中..." });

    const phase1Span = trace?.span({
      name: "phase-1-data-collection",
      input: {
        latitude: params.latitude,
        longitude: params.longitude,
        locationName: params.locationName,
        categories: params.categories,
      },
    });

    let collected: Awaited<ReturnType<typeof collectAllData>> | undefined;
    try {
      collected = await collectAllData({
        latitude: params.latitude,
        longitude: params.longitude,
        locationName: params.locationName,
        categories: params.categories,
      });
    } finally {
      phase1Span?.end({
        output: collected
          ? {
              totalCandidates: Object.values(collected.placesByCategory).reduce(
                (sum, places) => sum + places.length,
                0,
              ),
              hasWeather: !!collected.weather,
              hasTrends: !!collected.trends,
              collectionDurationMs: collected.collectionDurationMs,
            }
          : undefined,
      });
    }

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

    const selectionGen = trace?.generation({
      name: "phase-2a-spot-selection",
      model: "google/gemini-2.5-flash-lite",
      input: selectionPrompt,
    });

    let selectionResponse: Awaited<ReturnType<typeof spotSelectionAgent.generate>> | undefined;
    try {
      selectionResponse = await spotSelectionAgent.generate(selectionPrompt, { maxSteps: 1 });
    } finally {
      selectionGen?.end({
        output: selectionResponse?.text ?? "",
        usage: {
          input: selectionResponse?.usage?.inputTokens ?? undefined,
          output: selectionResponse?.usage?.outputTokens ?? undefined,
        },
      });
    }

    const { selectedAliases } = parseSelectionResponse(selectionResponse.text ?? "");

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

    // 並列実行なので Promise.all の前に両方の generation を開始する
    const timingGen = trace?.generation({
      name: "phase-2b-timing",
      model: "google/gemini-2.5-flash-lite",
      input: timingPrompt,
      metadata: { maxSteps: 4 },
    });
    const costGen = trace?.generation({
      name: "phase-2b-cost",
      model: "google/gemini-2.5-flash-lite",
      input: costPrompt,
    });

    let timingResponse: Awaited<ReturnType<typeof timingAgent.generate>> | undefined;
    let costResponse: Awaited<ReturnType<typeof costAgent.generate>> | undefined;
    try {
      [timingResponse, costResponse] = await Promise.all([
        timingAgent.generate(timingPrompt, { maxSteps: 4 }),
        costAgent.generate(costPrompt, { maxSteps: 1 }),
      ]);
    } finally {
      // timingAgent は maxSteps:4 なので複数ステップ累計の totalUsage を使う
      timingGen?.end({
        output: timingResponse?.text ?? "",
        usage: {
          input: timingResponse?.totalUsage?.inputTokens ?? undefined,
          output: timingResponse?.totalUsage?.outputTokens ?? undefined,
        },
      });
      costGen?.end({
        output: costResponse?.text ?? "",
        usage: {
          input: costResponse?.usage?.inputTokens ?? undefined,
          output: costResponse?.usage?.outputTokens ?? undefined,
        },
      });
    }

    const timing = parseTimingResponse(timingResponse.text ?? "");
    const cost = parseCostResponse(costResponse.text ?? "");

    // --- Phase 2c: タイトル生成（実スケジュールを元に）---
    const schedule = validAliases.map((alias) => {
      const spot = collected.aliasRegistry[alias];
      const t = timing[alias];
      const arrivalHour = t
        ? new Date(t.arrivalTime).getHours()
        : new Date(planStartTime).getHours();
      return { name: spot.name, arrivalHour };
    });

    const titlePrompt = createTitlePrompt({
      schedule,
      categories: params.categories,
      weather: collected.weather,
      trends: collected.trends,
    });

    const titleGen = trace?.generation({
      name: "phase-2c-title",
      model: "google/gemini-2.5-flash-lite",
      input: titlePrompt,
    });

    let titleResponse: Awaited<ReturnType<typeof spotSelectionAgent.generate>> | undefined;
    try {
      titleResponse = await spotSelectionAgent.generate(titlePrompt, { maxSteps: 1 });
    } finally {
      titleGen?.end({
        output: titleResponse?.text ?? "",
        usage: {
          input: titleResponse?.usage?.inputTokens ?? undefined,
          output: titleResponse?.usage?.outputTokens ?? undefined,
        },
      });
    }

    const title = parseTitleResponse(titleResponse?.text ?? "");

    // --- Phase 3: コード組み立て + Zod 検証 ---
    onProgress?.({ status: "assembling", message: "プランを整理中..." });

    const phase3Span = trace?.span({ name: "phase-3-assembly" });

    let plan: Awaited<ReturnType<typeof assemblePlan>> | undefined;
    try {
      plan = assemblePlan({
        title,
        selectedAliases: validAliases,
        registry: collected.aliasRegistry,
        timing,
        cost,
      });
    } finally {
      phase3Span?.end({
        output: plan ? { spotsCount: plan.spots.length, totalCost: plan.totalCost } : undefined,
      });
    }

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

      // 予算遵守率 (1.0 = ピッタリ, <1.0 = 予算内, >1.0 = 超過)
      if (params.budget > 0) {
        addTraceScore({
          traceId: trace.id,
          name: "budget-compliance",
          value: plan.totalCost / params.budget,
          comment: `totalCost=${plan.totalCost} / budget=${params.budget}`,
        });
      }
      // スポット密度 (スポット数 / 時間数)
      if (params.durationHours > 0) {
        addTraceScore({
          traceId: trace.id,
          name: "spots-per-hour",
          value: plan.spots.length / params.durationHours,
          comment: `${plan.spots.length} spots / ${params.durationHours} hours`,
        });
      }
      addTraceScore({
        traceId: trace.id,
        name: "has-weather-data",
        value: collected.weather ? 1 : 0,
      });
      addTraceScore({ traceId: trace.id, name: "has-trend-data", value: collected.trends ? 1 : 0 });
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

import { Agent } from "@mastra/core/agent";
import { searchNearbyPlacesTool, calculateDistanceTool } from "./tools";
import { PLAN_GENERATION_PROMPT } from "./prompts";

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
 * プラン構造化エージェント
 */
export const planStructuringAgent = new Agent({
  id: "outing-plan-structuring-agent",
  name: "Outing Plan Structuring Agent",
  instructions:
    "あなたはJSON構造化アシスタントです。与えられた下書きを、指定スキーマに厳密に合わせたJSONオブジェクトへ変換してください。",
  model: "google/gemini-2.5-flash-lite",
});

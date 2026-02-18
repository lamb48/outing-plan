import { Agent } from "@mastra/core/agent";
import { calculateDistanceTool } from "../tools";
import { TIMING_SYSTEM_PROMPT } from "../prompts/timing-prompt";

/**
 * タイミングエージェント
 * - calculateDistanceTool のみ使用（searchNearbyPlacesTool は不要）
 * - 移動距離計算 → 到着/出発時刻の決定
 * - maxSteps: 4（各スポット間の距離計算 最大3回 + 最終出力1回）
 */
export const timingAgent = new Agent({
  id: "timing-agent",
  name: "Timing Agent",
  instructions: TIMING_SYSTEM_PROMPT,
  model: "google/gemini-2.5-flash-lite",
  tools: {
    calculateDistanceTool,
  },
});

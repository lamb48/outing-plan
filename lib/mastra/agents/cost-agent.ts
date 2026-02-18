import { Agent } from "@mastra/core/agent";
import { COST_SYSTEM_PROMPT } from "../prompts/cost-prompt";

/**
 * コスト推論エージェント
 * - ツールなし（priceLevel・店名・カテゴリから純推論）
 * - タイミングエージェントと並列実行可能（互いに独立）
 * - maxSteps: 1（純粋な推論、ツール呼び出しなし）
 */
export const costAgent = new Agent({
  id: "cost-agent",
  name: "Cost Estimation Agent",
  instructions: COST_SYSTEM_PROMPT,
  model: "google/gemini-2.5-flash-lite",
});

import { Agent } from "@mastra/core/agent";
import { SPOT_SELECTION_SYSTEM_PROMPT } from "../prompts/spot-selection-prompt";

/**
 * スポット選定エージェント
 * - ツールなし（alias ベースで推論のみ）
 * - 時間帯・天気・カテゴリを考慮してスポットを選定
 */
export const spotSelectionAgent = new Agent({
  id: "spot-selection-agent",
  name: "Spot Selection Agent",
  instructions: SPOT_SELECTION_SYSTEM_PROMPT,
  model: "google/gemini-2.5-flash-lite",
});

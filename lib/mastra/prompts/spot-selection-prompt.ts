/**
 * スポット選定エージェント用プロンプト
 *
 * - LLMには alias (R1, C1, M1等) のみを渡す（長いハッシュ値は含まない）
 * - 時間帯・天気・カテゴリバランスを考慮した選定を行う
 */

import { type WeatherData, type TrendData } from "../data-collectors/index";

export const SPOT_SELECTION_SYSTEM_PROMPT = `あなたはおでかけプランのスポット選定専門AIです。
候補スポットリストから最適なスポットを選び、訪問順序を決定してください。

## 役割
- 総時間に応じた適切な件数を選んでください（後述の件数の目安を参照）
- 各指定カテゴリから少なくとも1件選ぶこと（可能な場合）
- 予算・時間・天気・時間帯を考慮すること

## 時間帯のガイドライン（重要）
- 開始が18:00以降: バー・居酒屋・ディナーレストラン向き。博物館・観光地は閉館の可能性があり避けること
- 開始が12:00〜17:00: ランチ・カフェ・観光地向き
- 開始が6:00〜11:00: カフェ・午前営業スポット優先。バー・深夜系は避ける
- 食事の自然な流れを意識すること（例: ディナー→バー、ランチ→カフェ→観光）

## 屋外スポットの判断
- 天気が悪い（雨・強風）場合: 公園・屋外観光地よりも室内スポットを優先する

## 多様性（重要）
- リスト先頭のスポットだけを選ばないこと。中盤・後半の候補も積極的に検討すること
- 著名・定番スポットに偏らず、ユニークまたは穴場のスポットも候補に加えること

## 出力形式（厳守）
純粋なJSONのみ。説明文・コードフェンス禁止。
{ "selectedAliases": ["R2", "C1", "M1"] }`;

function calcSpotRange(durationHours: number): { minSpots: number; maxSpots: number } {
  // 1スポットあたり平均90分（滞在+移動）を基準に算出
  const minSpots = Math.max(1, Math.floor(durationHours / 2));
  const maxSpots = Math.max(minSpots, Math.min(7, Math.ceil(durationHours / 1.5)));
  return { minSpots, maxSpots };
}

export function createSpotSelectionPrompt(params: {
  aliasListText: string;
  budget: number;
  durationHours: number;
  categories: string[];
  startTime: string;
  weather: WeatherData | null;
  trends: TrendData | null;
}): string {
  const { aliasListText, budget, durationHours, categories, startTime, weather, trends } = params;

  const startDate = new Date(startTime);
  const startHour = startDate.getHours();
  const startTimeStr = startDate.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  let timeContext = "";
  if (startHour >= 18) {
    timeContext = "夜（18時以降）のプラン。バー・居酒屋・ディナー向き。";
  } else if (startHour >= 12) {
    timeContext = "午後のプラン。ランチ・カフェ・観光向き。";
  } else {
    timeContext = "午前のプラン。カフェ・午前開館スポット向き。";
  }

  const weatherSection = weather
    ? `## 天気情報
- 気温: ${weather.temperature}°C / ${weather.weatherDescription}
- 屋外適否: ${weather.isOutdoorFriendly ? "○ 屋外活動に適しています" : "× 天気が悪いため屋内スポットを優先してください"}`
    : "";

  const trendsSection = trends
    ? `## エリアのトレンド情報（${trends.query}）
${trends.summary.slice(0, 400)}`
    : "";

  const { minSpots, maxSpots } = calcSpotRange(durationHours);
  const spotsGuide = minSpots === maxSpots ? `${minSpots}件` : `${minSpots}〜${maxSpots}件`;

  return `以下の候補から最適なスポットを選んでください。

## 候補スポット
${aliasListText}

## 条件
- 予算: ${budget.toLocaleString()}円
- 時間: ${durationHours}時間
- 開始時刻: ${startTimeStr}（${timeContext}）
- 指定カテゴリ: ${categories.join(", ")}（各カテゴリから1件以上選ぶこと）

${weatherSection}

${trendsSection}

## 件数の目安
${durationHours}時間のプランなので **${spotsGuide}** が適切です。
移動・滞在を含めた現実的な時間配分を考慮してください。

## 指示
時間帯・天気・カテゴリバランスを考慮して自然な訪問順序に並べてください。
リスト全体から幅広く候補を検討し、毎回異なる選択をするよう意識してください。
出力はJSON: { "selectedAliases": ["X1", "Y2", "Z3"] }`;
}

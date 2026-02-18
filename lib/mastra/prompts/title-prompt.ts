/**
 * タイトル生成用プロンプト（Phase 2c）
 *
 * - Phase 2b（timingAgent）後に実際の訪問スケジュールを受け取る
 * - 各スポットの arrivalHour を元に夜・朝表現の適否を判断する
 */

import { type WeatherData, type TrendData } from "../data-collectors/index";

export function createTitlePrompt(params: {
  schedule: Array<{ name: string; arrivalHour: number }>;
  categories: string[];
  weather: WeatherData | null;
  trends: TrendData | null;
}): string {
  const { schedule, categories, weather, trends } = params;

  const hasEveningVisit = schedule.some((s) => s.arrivalHour >= 18);
  const hasMorningVisit = schedule.some((s) => s.arrivalHour < 11);

  const scheduleText = schedule.map((s) => `- ${s.name}（${s.arrivalHour}:00着）`).join("\n");

  const timeRuleLines: string[] = [];
  if (!hasEveningVisit) {
    timeRuleLines.push(
      "「夜」「ナイト」「ディナー」「イブニング」等の夜・深夜を示す表現は使用禁止",
    );
  }
  if (!hasMorningVisit) {
    timeRuleLines.push("「朝」「モーニング」等の午前を示す表現は使用禁止");
  }
  const timeRuleSection =
    timeRuleLines.length > 0
      ? `\n## タイトルの時間帯ルール\n${timeRuleLines.map((l) => `- ${l}`).join("\n")}`
      : "";

  const weatherSection = weather
    ? `\n## 天気\n${weather.weatherDescription}（気温 ${weather.temperature}°C）`
    : "";

  const trendsSection = trends ? `\n## エリアのトレンド\n${trends.summary.slice(0, 200)}` : "";

  return `以下のおでかけプランに魅力的な日本語タイトルをつけてください。

## 訪問スケジュール
${scheduleText}

## カテゴリ
${categories.join(", ")}
${timeRuleSection}
${weatherSection}
${trendsSection}

## タイトルのスタイル（多様に使うこと）
- 感情・雰囲気重視: 「谷中のノスタルジックな街歩き」
- テーマ型: 「アートと食が交差する表参道コース」
- 季節・天気活かし: 「雨の日の上野ミュージアム巡り」
- ライフスタイル型: 「週末ゆるっと吉祥寺散策」
- 体験型: 「下北沢でレコードとカレーはしご」
20文字以内。地名＋カテゴリ＋活動の単純な羅列は避け、そのプランならではの個性を出すこと。

出力はJSON: { "title": "..." }`;
}

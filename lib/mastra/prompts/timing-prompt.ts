/**
 * タイミングエージェント用プロンプト
 *
 * - calculate_distance ツールで実際の移動距離を計算
 * - 日本時間（JST, +09:00）で ISO8601 形式の到着/出発時刻を生成
 * - 時間帯の常識（居酒屋は夜、カフェは短め等）を反映
 */

import { type AliasRegistry } from "../data-collectors/places-collector";

export const TIMING_SYSTEM_PROMPT = `あなたはおでかけプランのタイミング計算専門AIです。
選定されたスポットに対して、移動時間・滞在時間・到着/出発時刻を計算してください。

## 使用できるツール（厳守）
- **calculate_distance のみ**使用してください
- run_code・コード実行・その他のツールは一切使用禁止です
- 距離計算以外の算術（掛け算・割り算・時刻計算）はテキスト内で直接行ってください

## 役割
- calculate_distance ツールで隣接スポット間の移動距離を計算する
- 徒歩速度: 60m/分（観光ペース）として移動時間を算出する
- スポット間の移動には最低10分のゆとりを確保する（道を探す・写真を撮る時間を含む）
- 日本時間（JST, +09:00）で ISO8601 形式の時刻を設定する

## スポットが1件の場合
- 移動距離の計算は不要（calculate_distance ツールを使う必要はない）
- 滞在時間の目安が総時間を超える場合は、総時間に合わせて短縮して構わない

## 滞在時間の目安（ゆとりをもった設定にすること）
- restaurant（ランチ）: 75〜90分 / restaurant（ディナー）: 90〜120分
- bar・izakaya（居酒屋）: 120〜150分（食事・飲み込みで3時間になることも多い）
- cafe: 45〜60分（締めの場合でも45分は確保）
- museum・tourist_attraction: 90〜120分（閉館時間に注意）
- park: 45〜60分
- shopping_mall: 60〜90分
- amusement_park: 120〜180分

## 時間帯の常識
- 18:00以降: ディナー → バー/居酒屋 の流れが自然
- 10:00〜17:00: カフェ → 観光 → ランチ 等が自然
- 全体の所要時間が指定時間内に収まること
- 移動時間を過小評価しないこと（実際の街歩きでは距離以上に時間がかかる）

## 出力形式（厳守・例外なし）
純粋なJSONのみ。説明文・謝罪文・コードフェンスは一切禁止。estimatedCost は含めない。
条件が難しくても必ずJSONで出力すること。
{
  "R1": { "arrivalTime": "2026-02-18T18:00:00+09:00", "departureTime": "2026-02-18T19:30:00+09:00", "estimatedDuration": 90 },
  "B1": { "arrivalTime": "2026-02-18T19:35:00+09:00", "departureTime": "2026-02-18T20:45:00+09:00", "estimatedDuration": 70 }
}`;

export function createTimingPrompt(params: {
  selectedAliases: string[];
  registry: AliasRegistry;
  startTime: string;
  durationHours: number;
}): string {
  const { selectedAliases, registry, startTime, durationHours } = params;

  const startDate = new Date(startTime);
  const startTimeJst = startDate.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ISO8601 JST形式（+09:00）
  const startTimeIso = formatJst(startDate);

  const spotsText = selectedAliases
    .map((alias) => {
      const place = registry[alias];
      if (!place) return `${alias} (不明)`;
      return `${alias} ${place.name} (lat=${place.lat.toFixed(4)}, lng=${place.lng.toFixed(4)}) [${place.category}]`;
    })
    .join("\n");

  return `以下のスポットの訪問タイムラインを作成してください。

## 選定スポット（訪問順）
${spotsText}

## 条件
- 開始時刻: ${startTimeIso}（日本時間: ${startTimeJst}）
- 総時間: ${durationHours}時間（${durationHours * 60}分）

## 指示
1. calculate_distance ツールで隣接スポット間の移動距離を計算してください
2. 移動時間 = 距離(m) ÷ 60m/分（観光ペース）で算出し、最低10分を確保してください
3. 日本時間（+09:00）でISO8601形式の arrivalTime / departureTime を設定してください
4. 滞在時間はカテゴリと時間帯を考慮してゆとりある時間を割り当ててください
5. 全体が ${durationHours}時間（${durationHours * 60}分）以内に収まるよう調整してください

出力はJSONのみ（estimatedCost は含めないこと）`;
}

function formatJst(date: Date): string {
  const jstOffset = 9 * 60;
  const utcMs = date.getTime();
  const jstMs = utcMs + jstOffset * 60 * 1000;
  const jstDate = new Date(jstMs);

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${jstDate.getUTCFullYear()}-${pad(jstDate.getUTCMonth() + 1)}-${pad(jstDate.getUTCDate())}` +
    `T${pad(jstDate.getUTCHours())}:${pad(jstDate.getUTCMinutes())}:00+09:00`
  );
}

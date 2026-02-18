/**
 * コスト推論エージェント用プロンプト
 *
 * - priceLevel + 店名 + カテゴリから費用を LLM が推論
 * - ハードコードの固定式より精度が高い（居酒屋 vs バーの違い等を考慮）
 */

import { type AliasRegistry } from "../data-collectors/places-collector";

export const COST_SYSTEM_PROMPT = `あなたはおでかけプランのコスト推論専門AIです。
各スポットの費用を、カテゴリ・priceLevel・店名から推論してください。

## 推論ガイドライン（1人あたりの実態に近い金額を使うこと）
- priceLevel=1（¥）: 800〜1,500円/人
- priceLevel=2（¥¥）: 1,500〜3,000円/人
- priceLevel=3（¥¥¥）: 3,000〜6,000円/人
- priceLevel=4（¥¥¥¥）: 6,000円以上/人
- priceLevelなし: カテゴリの標準的な価格を推定

## カテゴリ別の目安（実態ベース）
- restaurant（ランチ）: 1,000〜2,000円（定食・ランチセット相場）
- restaurant（ディナー）: 2,500〜5,000円（casual）/ 5,000円以上（高級・コース）
- bar: 2,500〜5,000円（チャージ+ドリンク2〜3杯。高級バーはさらに高い）
- izakaya（居酒屋）: 3,000〜4,000円が平均（食事+飲み物込み）
- cafe: 700〜1,200円（ドリンク+軽食）。コメダ・コンセプト系は1,500円前後
- museum: 市立・区立は無料〜500円、私立は600〜1,500円、観光地型は1,500〜3,300円
- tourist_attraction: 神社・公園は無料、有料観光施設は500〜2,000円
- park: 0円（無料）
- amusement_park: 2,000〜8,000円（入場料のみ。アトラクション別途の場合も）
- shopping_mall: 購入見込み額を予算全体から推算（0〜5,000円の幅で）

## 店名からの推論（積極的に活用すること）
- "立ち飲み"・"角打ち"・"ホッピー"・"せんべろ" 等 → 2,000〜2,500円
- "居酒屋"・"酒場"・"炉端" 等 → 3,000〜4,000円
- "バル"・"ビストロ"・"ダイニング"・"ガストロノミー" → 3,500〜5,000円
- "バー"・"ラウンジ"・"カクテル" → 3,000〜5,000円（チャージ込み）
- "高級"・"懐石"・"鮨"・"フレンチ"・"コース" 等 → 6,000円以上
- "チェーン系"（マクドナルド、松屋等）→ 500〜1,000円

## 制約
- 合計コストが指定予算内に収まること
- 安すぎる見積もりは避けること。実際の外食は想像より高くなりがち
- 個々のスポットは予算を参考に自然な金額を設定すること（全スポットで均等に使い切る必要はない）

## 出力形式（厳守）
純粋なJSONのみ。arrivalTime等の時間情報は含めない。
{
  "R1": { "estimatedCost": 3500 },
  "B1": { "estimatedCost": 3000 },
  "C1": { "estimatedCost": 900 }
}`;

export function createCostPrompt(params: {
  selectedAliases: string[];
  registry: AliasRegistry;
  budget: number;
}): string {
  const { selectedAliases, registry, budget } = params;

  const spotsText = selectedAliases
    .map((alias) => {
      const place = registry[alias];
      if (!place) return `${alias} (不明)`;
      const priceStr =
        place.priceLevel != null
          ? ` priceLevel=${place.priceLevel}（${"¥".repeat(place.priceLevel)}）`
          : " priceLevel=なし";
      return `${alias} ${place.name} [${place.category}]${priceStr}`;
    })
    .join("\n");

  return `以下のスポットの費用を推論してください。

## 選定スポット
${spotsText}

## 条件
- 総予算: ${budget.toLocaleString()}円
- 合計費用が総予算以内に収まるよう設定すること

## 指示
各スポットの費用を priceLevel・店名・カテゴリから推論し、JSONで出力してください。
出力はJSONのみ（arrivalTime等の時間情報は含めないこと）`;
}

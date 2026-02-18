/**
 * コスト推論エージェント用プロンプト
 *
 * - priceLevel + 店名 + カテゴリから費用を LLM が推論
 * - ハードコードの固定式より精度が高い（居酒屋 vs バーの違い等を考慮）
 */

import { type AliasRegistry } from "../data-collectors/places-collector";

export const COST_SYSTEM_PROMPT = `あなたはおでかけプランのコスト推論専門AIです。
各スポットの費用を、カテゴリ・priceLevel・店名から推論してください。

## 推論ガイドライン
- priceLevel=1（¥）: 〜1,000円/人
- priceLevel=2（¥¥）: 1,000〜2,000円/人
- priceLevel=3（¥¥¥）: 2,000〜4,000円/人
- priceLevel=4（¥¥¥¥）: 4,000円以上/人
- priceLevelなし: カテゴリの標準的な価格を推定

## カテゴリ別の目安
- restaurant: priceLevelを基準に推論（ランチは安め、ディナーは高め傾向）
- bar・izakaya（居酒屋）: 飲食込みで1,500〜4,000円（立ち飲み・角打ちは安め）
- cafe: 500〜1,000円
- museum: 市立・区立は無料〜500円、私立・テーマパーク系は1,000〜2,500円
- tourist_attraction: 神社・公園は無料、有料施設は500〜2,000円
- park: 0円（無料）
- shopping_mall: 購入見込み額を予算から推算

## 店名からの推論
- "立ち飲み"・"角打ち"・"ホッピー" 等 → 安め（〜2,000円）
- "バル"・"ビストロ"・"ダイニング" → 中程度（2,000〜3,500円）
- "高級"・"懐石"・"コース" 等 → 高め

## 制約
- 合計コストが指定予算内に収まること
- 個々のスポットは予算を参考に自然な金額を設定すること（全スポットで均等に使い切る必要はない）

## 出力形式（厳守）
純粋なJSONのみ。arrivalTime等の時間情報は含めない。
{
  "R1": { "estimatedCost": 2000 },
  "B1": { "estimatedCost": 1800 },
  "C1": { "estimatedCost": 600 }
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

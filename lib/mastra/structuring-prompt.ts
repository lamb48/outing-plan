/**
 * 構造化プロンプトを作成
 */
export function createStructuringPrompt(basePrompt: string, draftText: string): string {
  const truncatedDraft = draftText.slice(0, 12000);

  return `あなたはおでかけプランの構造化担当です。以下の内容をもとに、指定スキーマに厳密に従うJSONオブジェクトを生成してください。

## 元の依頼
${basePrompt}

## 下書き（ツール実行結果を含む）
${truncatedDraft}

## 厳守事項
- スキーマにないキーを出力しない
- 数値項目は必ず数値で出力する
- spotsは配列で返す
- 回答はJSONオブジェクトのみ

## 【最重要】実データの保持
下書きに含まれるツール実行結果（search_nearby_places の結果）から、以下のフィールドを**一字一句そのまま抽出して使用**してください:

**必ず下書きから抽出するフィールド:**
1. **placeId**: 下書き内の "place_id" の値をそのままコピー
   - 正しい例: "ChIJN1t_tDeuEmsRUsoyG83frY4" （"ChIJ" で始まる長い文字列）
   - ❌ 禁止: "place_1", "place_2", "ChIJ...0000" などの生成値

2. **photoReference**: 下書き内の "photo_reference" の値をそのままコピー
   - 正しい例: "ATCDNfVbZzbnp9f7qWwJC2r-yPka9mO40Faz..." （長い文字列）
   - ❌ 禁止: "photo1", "photo_ref_1", "photo_ref_2" などの生成値
   - 存在しない場合: フィールドごと省略（undefined）

3. **lat, lng**: 下書き内の geometry.location.lat/lng の値をそのままコピー（数値）

4. **name, address, rating**: 下書き内の name, vicinity, rating の値をそのままコピー

**絶対禁止:**
❌ 「例として」「サンプルとして」生成値を作ってはいけない
❌ 下書きにない値を推測・補完してはいけない
❌ プレースホルダや連番（photo_ref_1, photo_ref_2...）を使ってはいけない

**下書きに実データが見つからない場合:**
- photoReference や rating が下書きに存在しない → フィールドごと省略（undefinedにする）
- それ以外のフィールドが見つからない → エラーとして報告（架空の値で埋めない）`;
}

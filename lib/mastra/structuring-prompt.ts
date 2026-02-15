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
- 回答はJSONオブジェクトのみ`;
}

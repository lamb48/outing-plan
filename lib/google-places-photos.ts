/**
 * Google Places Photo APIのユーティリティ関数
 */

/**
 * Google Places APIの写真参照からURL生成（プロキシ経由）
 * @param photoReference - Places APIから取得したphoto_reference
 * @param maxWidth - 画像の最大幅（デフォルト: 400px）
 * @returns プロキシ経由の画像URL
 */
export function getPlacePhotoUrl(photoReference: string, maxWidth: number = 400): string {
  if (!photoReference) {
    return "";
  }

  // プロキシエンドポイント経由で画像を取得
  return `/api/place-photo/${encodeURIComponent(photoReference)}?maxwidth=${maxWidth}`;
}

/**
 * 複数の写真参照から最初の有効なURLを取得
 * @param photoReferences - 写真参照の配列
 * @param maxWidth - 画像の最大幅
 * @returns 最初の有効な画像URL、なければ空文字列
 */
export function getFirstPlacePhotoUrl(
  photoReferences: string[] | undefined,
  maxWidth: number = 400,
): string {
  if (!photoReferences || photoReferences.length === 0) {
    return "";
  }

  return getPlacePhotoUrl(photoReferences[0], maxWidth);
}

/**
 * Supabase Storageのパブリック画像URLを取得するヘルパー関数
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Storageのパブリック画像URLを生成
 * @param bucket バケット名
 * @param path ファイルパス
 * @returns 完全なURL
 */
export function getPublicImageUrl(bucket: string, path: string): string {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  }

  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * よく使う画像のパスを定数化
 */
export const PUBLIC_IMAGES = {
  heroBackground: getPublicImageUrl("outing-plan", "images/hero-background.jpeg"),
  ogpImage: getPublicImageUrl("outing-plan", "images/ogp-image.png"),
} as const;

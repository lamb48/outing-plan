/**
 * 開始時刻の決定ロジック
 *
 * - 現在地の場合: 現在時刻をそのまま使用
 * - 場所指定の場合: カテゴリから最適な時間帯を推定
 */

const EVENING_CATEGORIES = new Set(["bar", "restaurant"]);
const DAYTIME_CATEGORIES = new Set(["museum", "tourist_attraction", "park", "amusement_park"]);

/**
 * 開始時刻を決定する
 * @param params.locationName "現在地" なら現在時刻、それ以外はカテゴリから推定
 * @param params.categories Google Places タイプの配列
 * @param params.startTime 明示的に指定された場合はそれを優先
 */
export function determineStartTime(params: {
  locationName?: string;
  categories: string[];
  startTime?: string;
}): string {
  const { locationName, categories, startTime } = params;

  // 明示的に指定されている場合は優先
  if (startTime) {
    return startTime;
  }

  // 現在地の場合は現在時刻
  if (locationName === "現在地") {
    return new Date().toISOString();
  }

  // 場所指定の場合: カテゴリから推定
  const now = new Date();
  const today = new Date(now);
  today.setSeconds(0, 0);

  // バー・居酒屋が含まれる → 夜プラン
  const hasEveningCategory = categories.some((c) => EVENING_CATEGORIES.has(c) && c === "bar");
  if (hasEveningCategory) {
    today.setHours(18, 0);
    return today.toISOString();
  }

  // 博物館・観光地・公園が主体 → 昼プラン
  const hasDaytimeCategory = categories.some((c) => DAYTIME_CATEGORIES.has(c));
  const hasOnlyDaytime = categories.every(
    (c) => DAYTIME_CATEGORIES.has(c) || c === "cafe" || c === "shopping_mall",
  );
  if (hasDaytimeCategory && hasOnlyDaytime) {
    today.setHours(10, 0);
    return today.toISOString();
  }

  // restaurant + cafe 等: ランチプランとして12時
  const hasRestaurant = categories.includes("restaurant");
  if (hasRestaurant) {
    today.setHours(12, 0);
    return today.toISOString();
  }

  // デフォルト: 現在時刻
  return new Date().toISOString();
}

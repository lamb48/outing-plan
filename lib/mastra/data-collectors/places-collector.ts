/**
 * Google Places 並列検索 + Alias Registry
 *
 * - LLMに長いハッシュ値（placeId, photoReference）を渡さないためのレジストリを提供
 * - 各スポットに短い alias (R1, C1, M1 等) を割り当てる
 */

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  rating?: number;
  priceLevel?: number;
  photoReference?: string;
}

/** alias → PlaceResult のマッピング（LLMには渡さない実データ） */
export type AliasRegistry = Record<string, PlaceResult>;

interface GooglePlacesApiPlace {
  place_id: string;
  name?: string;
  vicinity?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
  }>;
}

/** カテゴリ → alias プレフィックス */
const CATEGORY_PREFIX: Record<string, string> = {
  restaurant: "R",
  cafe: "C",
  museum: "M",
  park: "P",
  tourist_attraction: "T",
  shopping_mall: "S",
  amusement_park: "A",
  bar: "B",
};

function getCategoryPrefix(category: string): string {
  return CATEGORY_PREFIX[category] ?? "X";
}

/**
 * 指定エリア・カテゴリで周辺スポットを検索（純関数）
 */
export async function searchNearbyPlaces(params: {
  latitude: number;
  longitude: number;
  category: string;
  radius?: number;
  maxResults?: number;
}): Promise<PlaceResult[]> {
  const { latitude, longitude, category, radius = 2000, maxResults = 20 } = params;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }

  const searchParams = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: radius.toString(),
    type: category,
    language: "ja",
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${searchParams}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status} ${data.error_message || ""}`);
  }

  const places: GooglePlacesApiPlace[] = data.results || [];

  return places.slice(0, maxResults).map((place) => ({
    placeId: place.place_id,
    name: place.name || "Unknown",
    address: place.vicinity || "",
    lat: place.geometry?.location?.lat ?? 0,
    lng: place.geometry?.location?.lng ?? 0,
    category,
    rating: place.rating,
    priceLevel: place.price_level,
    photoReference: place.photos?.[0]?.photo_reference,
  }));
}

/**
 * 複数カテゴリを並列検索
 */
export async function searchPlacesForCategories(
  latitude: number,
  longitude: number,
  categories: string[],
  options?: { radius?: number; maxResults?: number },
): Promise<Record<string, PlaceResult[]>> {
  const results = await Promise.all(
    categories.map((category) =>
      searchNearbyPlaces({ latitude, longitude, category, ...options }).catch((err) => {
        console.error(`[places-collector] Failed to search category "${category}":`, err);
        return [] as PlaceResult[];
      }),
    ),
  );

  return Object.fromEntries(categories.map((cat, i) => [cat, results[i]]));
}

/**
 * 配列からランダムにn件サンプリング（非破壊）
 */
function randomSample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/**
 * カテゴリ別検索結果から AliasRegistry を構築
 * restaurant → R1, R2, ..., cafe → C1, C2, ... の形式
 *
 * 上位固定スキップ方式でランダム性を確保:
 * - rating上位25%（常に選ばれがちな有名スポット）をスキップ
 * - 残り75%からランダムに8件サンプリング → 毎回異なる候補セット
 */
export function buildAliasRegistry(placesByCategory: Record<string, PlaceResult[]>): AliasRegistry {
  const registry: AliasRegistry = {};

  for (const [category, places] of Object.entries(placesByCategory)) {
    const prefix = getCategoryPrefix(category);

    // ratingでソート（null/undefinedは末尾）
    const sorted = [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    // 上位25%をスキップして固定化を防ぐ（最低4件残す）
    const skipCount = Math.min(Math.floor(sorted.length * 0.25), sorted.length - 4);
    const pool = sorted.slice(Math.max(0, skipCount));

    // プールからランダム8件サンプリングしてaliasを付与
    const sampled = randomSample(pool, 8);
    sampled.forEach((place, index) => {
      const alias = `${prefix}${index + 1}`;
      registry[alias] = place;
    });
  }

  return registry;
}

/** priceLevel → ¥表記 */
function formatPriceLevel(priceLevel?: number): string {
  if (priceLevel == null) return "";
  return " " + "¥".repeat(priceLevel);
}

/**
 * LLMに渡す軽量テキスト表現を生成（placeId/photoReference は含まない）
 * rating は表示しない（LLMの高評価バイアスを排除するため）
 */
export function formatAliasListForLLM(registry: AliasRegistry): string {
  return Object.entries(registry)
    .map(([alias, place]) => {
      const price = formatPriceLevel(place.priceLevel);
      return `${alias} ${place.name}${price} [${place.category}] (${place.lat.toFixed(4)},${place.lng.toFixed(4)})`;
    })
    .join("\n");
}

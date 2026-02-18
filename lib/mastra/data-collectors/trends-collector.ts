/**
 * Tavily トレンド情報取得
 *
 * エリア名 + カテゴリから「話題のスポット・イベント」を検索する。
 * - locationName が "現在地" または未設定の場合: Google Geocoding で lat/lng から地域名を取得して検索
 * - TAVILY_API_KEY が未設定の場合は null を返す（ノンブロッキング）
 * - 失敗時は null を返す
 */

export interface TrendData {
  query: string;
  summary: string;
}

const CATEGORY_KEYWORDS: Partial<Record<string, string>> = {
  restaurant: "グルメ レストラン 食事",
  cafe: "カフェ コーヒー スイーツ",
  bar: "バー 居酒屋 ナイトライフ",
  museum: "美術館 博物館 展覧会",
  tourist_attraction: "観光スポット 名所",
  park: "公園 自然",
  shopping_mall: "ショッピング",
  amusement_park: "遊園地 エンタメ",
};

/**
 * lat/lng → 地域名を Google Geocoding API で取得
 * 取得できない場合は null を返す
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      language: "ja",
      result_type: "locality|sublocality",
      key: apiKey,
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      status: string;
      results: {
        address_components: { long_name: string; types: string[] }[];
      }[];
    };

    if (data.status !== "OK" || !data.results.length) return null;

    // sublocality_level_1（区・市区町村）を優先し、なければ locality（市）を使う
    const components = data.results[0].address_components;
    const sublocality = components.find((c) => c.types.includes("sublocality_level_1"));
    const locality = components.find((c) => c.types.includes("locality"));

    return sublocality?.long_name ?? locality?.long_name ?? null;
  } catch {
    return null;
  }
}

function buildSearchQuery(locationName: string, categories: string[]): string {
  const keywords = categories
    .map((c) => CATEGORY_KEYWORDS[c])
    .filter(Boolean)
    .join(" ");
  const year = new Date().getFullYear();
  return `${locationName} ${keywords} 人気 おすすめ ${year}`;
}

/**
 * Tavily でトレンド情報を取得（失敗時は null を返す）
 */
export async function fetchTrends(params: {
  locationName?: string;
  latitude: number;
  longitude: number;
  categories: string[];
}): Promise<TrendData | null> {
  const { locationName, latitude, longitude, categories } = params;

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[trends-collector] TAVILY_API_KEY not set, skipping trends");
    return null;
  }

  // 場所名が "現在地" または未設定の場合は Geocoding で取得する
  const resolvedLocation =
    locationName && locationName !== "現在地"
      ? locationName
      : await reverseGeocode(latitude, longitude);

  if (!resolvedLocation) {
    console.warn("[trends-collector] Could not resolve location name, skipping trends");
    return null;
  }

  const query = buildSearchQuery(resolvedLocation, categories);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      console.warn(`[trends-collector] Tavily API returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      answer?: string;
      results?: { content?: string }[];
    };

    // answer フィールドがあればそれを優先。なければ results の content を結合
    const summary =
      (typeof data.answer === "string" ? data.answer : "") ||
      (Array.isArray(data.results)
        ? data.results
            .slice(0, 3)
            .map((r) => r.content ?? "")
            .filter(Boolean)
            .join(" ")
            .slice(0, 500)
        : "");

    if (!summary) {
      return null;
    }

    return { query, summary };
  } catch (error) {
    console.warn("[trends-collector] Failed to fetch trends:", error);
    return null;
  }
}

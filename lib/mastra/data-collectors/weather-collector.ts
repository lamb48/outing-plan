/**
 * Open-Meteo 天気情報取得
 * APIキー不要・無料
 * https://open-meteo.com/
 */

export interface HourlyForecast {
  hour: string;
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  weatherDescription: string;
  precipitation: number;
  windSpeed: number;
  hourlyForecast: HourlyForecast[];
  isOutdoorFriendly: boolean;
}

/** WMO 天気コード → 日本語説明 */
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "快晴",
  1: "おおむね晴れ",
  2: "薄曇り",
  3: "曇り",
  45: "霧",
  48: "霧氷",
  51: "霧雨（弱）",
  53: "霧雨",
  55: "霧雨（強）",
  56: "凍雨（弱）",
  57: "凍雨（強）",
  61: "小雨",
  63: "雨",
  65: "大雨",
  66: "凍雨（弱）",
  67: "凍雨（強）",
  71: "小雪",
  73: "雪",
  75: "大雪",
  77: "霰",
  80: "にわか雨（弱）",
  81: "にわか雨",
  82: "にわか雨（強）",
  85: "にわか雪（弱）",
  86: "にわか雪（強）",
  95: "雷雨",
  96: "雷雨（雹あり）",
  99: "激しい雷雨（雹あり）",
};

function getWeatherDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? "不明";
}

/**
 * 天気データを取得（失敗時は null を返す）
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: "temperature_2m,weather_code,wind_speed_10m,precipitation",
      hourly: "temperature_2m,weather_code,precipitation_probability",
      forecast_days: "1",
      timezone: "Asia/Tokyo",
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[weather-collector] Open-Meteo API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    const current = data.current;
    const hourly = data.hourly;

    if (!current || !hourly) {
      return null;
    }

    const temperature: number = current.temperature_2m ?? 20;
    const weatherCode: number = current.weather_code ?? 0;
    const precipitation: number = current.precipitation ?? 0;
    const windSpeed: number = current.wind_speed_10m ?? 0;

    // 当日の時間別予報を組み立て（最大12件）
    const times: string[] = hourly.time ?? [];
    const hourlyTemps: number[] = hourly.temperature_2m ?? [];
    const hourlyPrecipProbs: number[] = hourly.precipitation_probability ?? [];
    const hourlyWeatherCodes: number[] = hourly.weather_code ?? [];

    const hourlyForecast: HourlyForecast[] = times
      .slice(0, 12)
      .map((timeStr: string, i: number) => ({
        hour: timeStr.split("T")[1]?.slice(0, 5) ?? "",
        temperature: Math.round(hourlyTemps[i] ?? 20),
        precipitationProbability: hourlyPrecipProbs[i] ?? 0,
        weatherCode: hourlyWeatherCodes[i] ?? 0,
      }));

    // 屋外適否: 雨・雪なし (weatherCode < 50) かつ 風速 < 30km/h
    const isOutdoorFriendly = weatherCode < 50 && windSpeed < 30;

    return {
      temperature: Math.round(temperature),
      weatherCode,
      weatherDescription: getWeatherDescription(weatherCode),
      precipitation,
      windSpeed: Math.round(windSpeed),
      hourlyForecast,
      isOutdoorFriendly,
    };
  } catch (error) {
    console.warn("[weather-collector] Failed to fetch weather data:", error);
    return null;
  }
}

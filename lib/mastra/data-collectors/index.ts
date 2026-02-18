/**
 * データ収集オーケストレーター
 * Google Places (全カテゴリ並列) + Open-Meteo 天気 を同時取得
 */

import {
  searchPlacesForCategories,
  buildAliasRegistry,
  type AliasRegistry,
  type PlaceResult,
} from "./places-collector";
import { fetchWeather, type WeatherData } from "./weather-collector";

export type { AliasRegistry, PlaceResult, WeatherData };

export interface CollectedData {
  placesByCategory: Record<string, PlaceResult[]>;
  aliasRegistry: AliasRegistry;
  weather: WeatherData | null;
  collectionDurationMs: number;
}

/**
 * 全データを並列収集する
 */
export async function collectAllData(params: {
  latitude: number;
  longitude: number;
  locationName?: string;
  categories: string[];
  options?: { radius?: number; maxResults?: number };
}): Promise<CollectedData> {
  const { latitude, longitude, categories, options } = params;
  const startTime = Date.now();

  const [placesByCategory, weather] = await Promise.all([
    searchPlacesForCategories(latitude, longitude, categories, options),
    fetchWeather(latitude, longitude),
  ]);

  const aliasRegistry = buildAliasRegistry(placesByCategory);

  return {
    placesByCategory,
    aliasRegistry,
    weather,
    collectionDurationMs: Date.now() - startTime,
  };
}

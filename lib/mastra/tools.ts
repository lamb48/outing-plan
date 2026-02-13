import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

/**
 * Google Places API Tool
 * 指定されたエリアとカテゴリで周辺スポットを検索
 */

interface PlaceResult {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  rating?: number
  priceLevel?: number
  photoReference?: string
}

const searchNearbyPlacesSchema = z.object({
  latitude: z.number().describe('検索エリアの緯度'),
  longitude: z.number().describe('検索エリアの経度'),
  category: z.string().describe('スポットのカテゴリ（例: restaurant, cafe, tourist_attraction, museum, park）'),
  radius: z.number().optional().default(2000).describe('検索半径（メートル、デフォルト2000m）'),
  maxResults: z.number().optional().default(10).describe('最大取得件数（デフォルト10件）'),
})

export const searchNearbyPlacesTool = createTool({
  id: 'search_nearby_places',
  description: '指定されたエリアとカテゴリで周辺スポットを検索します。レストラン、カフェ、観光地、博物館、公園などを見つけることができます。',
  inputSchema: searchNearbyPlacesSchema,
  execute: async (inputData) => {
    const { latitude, longitude, category, radius, maxResults } = inputData

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not set')
    }

    try {
      const params = new URLSearchParams({
        location: `${latitude},${longitude}`,
        radius: radius.toString(),
        type: category,
        language: 'ja',
        key: apiKey,
      })

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Google Places API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} ${data.error_message || ''}`)
      }

      const places = data.results || []

      const results: PlaceResult[] = places.slice(0, maxResults).map((place: any) => ({
        placeId: place.place_id,
        name: place.name || 'Unknown',
        address: place.vicinity || '',
        lat: place.geometry?.location?.lat || 0,
        lng: place.geometry?.location?.lng || 0,
        category,
        rating: place.rating,
        priceLevel: place.price_level,
        photoReference: place.photos?.[0]?.photo_reference,
      }))

      return {
        success: true,
        results,
        count: results.length,
      }
    } catch (error) {
      console.error('Error searching places:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
        count: 0,
      }
    }
  },
})

/**
 * 距離計算ツール（Haversine式）
 * 2点間の距離を計算
 */
const calculateDistanceSchema = z.object({
  lat1: z.number().describe('地点1の緯度'),
  lng1: z.number().describe('地点1の経度'),
  lat2: z.number().describe('地点2の緯度'),
  lng2: z.number().describe('地点2の経度'),
})

export const calculateDistanceTool = createTool({
  id: 'calculate_distance',
  description: '2つの地点間の直線距離を計算します（メートル単位）',
  inputSchema: calculateDistanceSchema,
  execute: async (inputData) => {
    const { lat1, lng1, lat2, lng2 } = inputData

    // Haversine formula
    const R = 6371e3 // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const distance = R * c // Distance in meters

    return {
      distance: Math.round(distance),
      distanceKm: (distance / 1000).toFixed(2),
    }
  },
})

export const tools = [searchNearbyPlacesTool, calculateDistanceTool]

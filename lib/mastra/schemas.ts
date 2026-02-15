import { z } from "zod";

/**
 * プラン生成パラメータ
 */
export interface GeneratePlanParams {
  latitude: number;
  longitude: number;
  locationName?: string;
  budget: number;
  categories: string[];
  durationHours: number;
  startTime?: string;
  userId?: string;
}

/**
 * プラン生成結果
 */
export interface GeneratedPlan {
  title: string;
  totalCost: number;
  totalDuration: number;
  spots: Array<{
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    category: string;
    rating?: number;
    photoReference?: string;
    estimatedDuration: number;
    estimatedCost: number;
    order: number;
    arrivalTime: string;
    departureTime: string;
  }>;
}

export const generatedPlanSchema = z.object({
  title: z.string(),
  totalCost: z.coerce.number().finite().nonnegative(),
  totalDuration: z.coerce.number().finite().nonnegative(),
  spots: z.array(
    z.object({
      placeId: z.string(),
      name: z.string(),
      address: z.string(),
      lat: z.coerce.number().finite().min(-90).max(90),
      lng: z.coerce.number().finite().min(-180).max(180),
      category: z.string(),
      rating: z.coerce.number().finite().min(0).max(5).optional(),
      photoReference: z.string().optional(),
      estimatedDuration: z.coerce.number().finite().nonnegative(),
      estimatedCost: z.coerce.number().finite().nonnegative(),
      order: z.coerce.number().finite().int().positive(),
      arrivalTime: z.string(),
      departureTime: z.string(),
    }),
  ),
});

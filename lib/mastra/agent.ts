import { Agent } from '@mastra/core/agent'
import { searchNearbyPlacesTool, calculateDistanceTool } from './tools'
import { PLAN_GENERATION_PROMPT, createUserPrompt } from './prompts'
import { createTrace } from '../langfuse'

/**
 * おでかけプラン生成エージェント
 */
export const outingPlanAgent = new Agent({
  id: 'outing-plan-agent',
  name: 'Outing Plan Agent',
  instructions: PLAN_GENERATION_PROMPT,
  model: 'google/gemini-1.5-pro',
  tools: {
    searchNearbyPlacesTool,
    calculateDistanceTool,
  },
})

/**
 * プラン生成パラメータ
 */
export interface GeneratePlanParams {
  latitude: number
  longitude: number
  locationName?: string
  budget: number
  category: string
  durationHours: number
  startTime?: string
  userId?: string
}

/**
 * プラン生成結果
 */
export interface GeneratedPlan {
  title: string
  totalCost: number
  totalDuration: number
  spots: Array<{
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
    category: string
    rating?: number
    photoReference?: string
    estimatedDuration: number
    estimatedCost: number
    order: number
    arrivalTime: string
    departureTime: string
  }>
}

/**
 * おでかけプランを生成（Langfuseトレーシング付き）
 */
export async function generateOutingPlan(params: GeneratePlanParams): Promise<GeneratedPlan> {
  const startTime = Date.now()

  // Langfuseトレース開始
  const trace = createTrace({
    name: 'generate-outing-plan',
    userId: params.userId,
    metadata: {
      latitude: params.latitude,
      longitude: params.longitude,
      locationName: params.locationName,
      budget: params.budget,
      category: params.category,
      durationHours: params.durationHours,
    },
  })

  try {
    const userPrompt = createUserPrompt(params)

    // Mastra Agentを使ってプランを生成
    const response = await outingPlanAgent.generate(userPrompt)

    // レスポンスからJSONを抽出
    const text = response.text || ''
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)

    let plan: GeneratedPlan

    if (!jsonMatch) {
      // JSONブロックがない場合、テキスト全体をパース試行
      try {
        plan = JSON.parse(text) as GeneratedPlan
      } catch {
        throw new Error('Failed to parse plan JSON from response')
      }
    } else {
      plan = JSON.parse(jsonMatch[1]) as GeneratedPlan
    }

    // Langfuseトレースに成功を記録
    if (trace) {
      trace.update({
        output: plan,
        metadata: {
          duration: Date.now() - startTime,
          spotsCount: plan.spots.length,
          totalCost: plan.totalCost,
        },
      })
    }

    return plan

  } catch (error) {
    // Langfuseトレースにエラーを記録
    if (trace) {
      trace.update({
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime,
        },
      })
    }

    console.error('Error generating plan:', error)
    throw new Error(
      error instanceof Error
        ? `プラン生成に失敗しました: ${error.message}`
        : 'プラン生成に失敗しました'
    )
  }
}

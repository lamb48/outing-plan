import { Agent } from '@mastra/core'
import { tools } from './tools'
import { PLAN_GENERATION_PROMPT, createUserPrompt } from './prompts'

/**
 * おでかけプラン生成エージェント
 */
export const outingPlanAgent = new Agent({
  name: 'outing-plan-agent',
  instructions: PLAN_GENERATION_PROMPT,
  model: {
    provider: 'GOOGLE',
    name: 'gemini-1.5-pro',
    toolChoice: 'auto',
  },
  tools,
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
 * おでかけプランを生成
 */
export async function generateOutingPlan(params: GeneratePlanParams): Promise<GeneratedPlan> {
  try {
    const userPrompt = createUserPrompt(params)

    // Mastra Agentを使ってプランを生成
    const response = await outingPlanAgent.generate(userPrompt, {
      maxTokens: 4096,
      temperature: 0.7,
    })

    // レスポンスからJSONを抽出
    const text = response.text || ''
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)

    if (!jsonMatch) {
      // JSONブロックがない場合、テキスト全体をパース試行
      try {
        const plan = JSON.parse(text)
        return plan as GeneratedPlan
      } catch {
        throw new Error('Failed to parse plan JSON from response')
      }
    }

    const plan = JSON.parse(jsonMatch[1])
    return plan as GeneratedPlan

  } catch (error) {
    console.error('Error generating plan:', error)
    throw new Error(
      error instanceof Error
        ? `プラン生成に失敗しました: ${error.message}`
        : 'プラン生成に失敗しました'
    )
  }
}

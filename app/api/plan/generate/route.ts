import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateOutingPlan } from '@/lib/mastra/agent'
import prisma from '@/lib/prisma'
import { flushLangfuse } from '@/lib/langfuse'

/**
 * プラン生成リクエストのバリデーションスキーマ
 */
const generatePlanSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().optional(),
  budget: z.number().min(0).max(1000000),
  category: z.string().min(1),
  durationHours: z.number().min(0.5).max(24),
  startTime: z.string().optional(),
})

/**
 * POST /api/plan/generate
 * AIプラン生成API
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // リクエストボディのパース
    const body = await request.json()

    // バリデーション
    const validationResult = generatePlanSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // ユーザーレコードの確認・作成（auth.users と public.users の同期）
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      // 初回ログイン時にユーザーレコードを作成
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
        },
      })
    }

    // AIプラン生成
    const plan = await generateOutingPlan({
      ...params,
      userId: user.id,
    })

    // DBに保存
    const savedPlan = await prisma.plan.create({
      data: {
        userId: user.id,
        title: plan.title,
        budget: params.budget,
        category: params.category,
        durationHours: params.durationHours,
        areaLat: params.latitude,
        areaLng: params.longitude,
        spots: plan.spots as any, // Prisma JsonValue
      },
    })

    // Langfuseバッファをフラッシュ
    await flushLangfuse()

    return NextResponse.json({
      success: true,
      plan: {
        id: savedPlan.id,
        title: savedPlan.title,
        budget: savedPlan.budget,
        category: savedPlan.category,
        durationHours: savedPlan.durationHours,
        totalCost: plan.totalCost,
        totalDuration: plan.totalDuration,
        spots: plan.spots,
        createdAt: savedPlan.createdAt.toISOString(),
      },
    })

  } catch (error) {
    console.error('Error generating plan:', error)

    // Langfuseバッファをフラッシュ（エラー時も）
    await flushLangfuse()

    return NextResponse.json(
      {
        error: 'Failed to generate plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

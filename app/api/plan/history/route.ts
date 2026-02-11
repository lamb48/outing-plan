import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/plan/history
 * プラン履歴取得API
 */
export async function GET(request: NextRequest) {
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

    // クエリパラメータ
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // プラン一覧取得（自分のプランのみ）
    const plans = await prisma.plan.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        budget: true,
        category: true,
        durationHours: true,
        areaLat: true,
        areaLng: true,
        spots: true,
        createdAt: true,
      },
    })

    // 総件数取得
    const total = await prisma.plan.count({
      where: {
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      plans: plans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        budget: plan.budget,
        category: plan.category,
        durationHours: plan.durationHours,
        areaLat: plan.areaLat,
        areaLng: plan.areaLng,
        spotsCount: Array.isArray(plan.spots) ? plan.spots.length : 0,
        createdAt: plan.createdAt.toISOString(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })

  } catch (error) {
    console.error('Error fetching plan history:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch plan history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

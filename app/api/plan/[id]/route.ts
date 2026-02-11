import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/plan/[id]
 * プラン詳細取得API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // プラン取得
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    // 自分のプランかチェック（RLSと同様のチェック）
    if (plan.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        title: plan.title,
        budget: plan.budget,
        category: plan.category,
        durationHours: plan.durationHours,
        areaLat: plan.areaLat,
        areaLng: plan.areaLng,
        spots: plan.spots,
        createdAt: plan.createdAt.toISOString(),
        user: plan.user,
      },
    })

  } catch (error) {
    console.error('Error fetching plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

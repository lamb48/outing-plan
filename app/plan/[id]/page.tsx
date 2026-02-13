import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { SpotCard } from '@/components/plan/SpotCard'
import { PlanMapWrapper } from '@/components/plan/PlanMapWrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

interface SpotWithRoute {
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
}

async function getPlan(planId: string) {
  const supabase = await createClient()

  const { data: plan, error } = await supabase
    .from('plans')
    .select('id, title, budget, category, duration_hours, area_lat, area_lng, spots, created_at')
    .eq('id', planId)
    .single()

  if (error || !plan) {
    return null
  }

  return {
    id: plan.id,
    title: plan.title,
    budget: plan.budget,
    category: plan.category,
    durationHours: plan.duration_hours,
    areaLat: plan.area_lat,
    areaLng: plan.area_lng,
    spots: plan.spots as unknown as SpotWithRoute[],
    createdAt: plan.created_at,
  }
}

export default async function PlanPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { id } = await params
  const plan = await getPlan(id)

  if (!plan) {
    notFound()
  }

  const totalCost = plan.spots.reduce((sum: number, spot: any) => sum + spot.estimatedCost, 0)
  const totalDuration = plan.spots.reduce((sum: number, spot: any) => sum + spot.estimatedDuration, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        {/* 戻るリンク */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          ホームに戻る
        </Link>

        {/* プラン概要 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{plan.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {plan.category} • {plan.spots.length}スポット
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                ¥{plan.budget.toLocaleString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">総費用</div>
                  <div className="text-lg font-semibold">¥{totalCost.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">総所要時間</div>
                  <div className="text-lg font-semibold">{Math.round(totalDuration / 60 * 10) / 10}時間</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">スポット数</div>
                  <div className="text-lg font-semibold">{plan.spots.length}箇所</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 地図エリア */}
          <div>
            <PlanMapWrapper spots={plan.spots} className="h-[500px]" />
          </div>

          {/* スポット一覧 */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">スポット一覧</h3>
            {plan.spots.map((spot: any) => (
              <SpotCard key={spot.placeId} spot={spot} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

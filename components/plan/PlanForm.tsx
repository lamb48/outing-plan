'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { MapPin, Loader2 } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

const planFormSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().optional(),
  budget: z.number().min(1000).max(100000),
  category: z.string().min(1),
  durationHours: z.number().min(0.5).max(12),
})

type PlanFormData = z.infer<typeof planFormSchema>

export function PlanForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      latitude: 35.6812,
      longitude: 139.7671,
      locationName: '東京駅',
      budget: 5000,
      category: 'グルメ',
      durationHours: 4,
    },
  })

  const budget = watch('budget')
  const durationHours = watch('durationHours')

  // 現在地取得
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('お使いのブラウザは位置情報に対応していません')
      return
    }

    setIsGettingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude)
        setValue('longitude', position.coords.longitude)
        setValue('locationName', '現在地')
        setIsGettingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        setError('位置情報の取得に失敗しました')
        setIsGettingLocation(false)
      }
    )
  }

  const onSubmit = async (data: PlanFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'プラン生成に失敗しました')
      }

      // プラン結果画面に遷移
      router.push(`/plan/${result.plan.id}`)

    } catch (error) {
      console.error('Error generating plan:', error)
      setError(error instanceof Error ? error.message : 'エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 位置情報 */}
      <div className="space-y-2">
        <Label>位置情報</Label>
        <div className="flex gap-2">
          <Input
            placeholder="東京駅"
            {...register('locationName')}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isLoading || isGettingLocation}
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="0.000001"
            placeholder="緯度"
            {...register('latitude', { valueAsNumber: true })}
            disabled={isLoading}
          />
          <Input
            type="number"
            step="0.000001"
            placeholder="経度"
            {...register('longitude', { valueAsNumber: true })}
            disabled={isLoading}
          />
        </div>
        {(errors.latitude || errors.longitude) && (
          <p className="text-sm text-red-600">有効な位置情報を入力してください</p>
        )}
      </div>

      {/* カテゴリ */}
      <div className="space-y-2">
        <Label>カテゴリ</Label>
        <Select
          onValueChange={(value) => setValue('category', value)}
          defaultValue="グルメ"
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="カテゴリを選択" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>

      {/* 予算 */}
      <div className="space-y-2">
        <Label>予算: {budget?.toLocaleString()}円</Label>
        <Slider
          min={1000}
          max={50000}
          step={1000}
          value={[budget || 5000]}
          onValueChange={(value) => setValue('budget', value[0])}
          disabled={isLoading}
        />
        {errors.budget && (
          <p className="text-sm text-red-600">{errors.budget.message}</p>
        )}
      </div>

      {/* 時間 */}
      <div className="space-y-2">
        <Label>時間: {durationHours}時間</Label>
        <Slider
          min={0.5}
          max={12}
          step={0.5}
          value={[durationHours || 4]}
          onValueChange={(value) => setValue('durationHours', value[0])}
          disabled={isLoading}
        />
        {errors.durationHours && (
          <p className="text-sm text-red-600">{errors.durationHours.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            AIがプランを作成中...
          </>
        ) : (
          'AIプラン生成'
        )}
      </Button>
    </form>
  )
}

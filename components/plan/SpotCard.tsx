import { MapPin, Clock, DollarSign, Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Spot {
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

interface SpotCardProps {
  spot: Spot
}

export function SpotCard({ spot }: SpotCardProps) {
  const arrivalTime = new Date(spot.arrivalTime).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const departureTime = new Date(spot.departureTime).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{spot.order}</Badge>
              <Badge variant="outline">{spot.category}</Badge>
            </div>
            <CardTitle className="text-xl">{spot.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {spot.address}
            </CardDescription>
          </div>
          {spot.rating && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-semibold">{spot.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500">滞在時間</div>
              <div className="font-medium">{spot.estimatedDuration}分</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500">予想費用</div>
              <div className="font-medium">¥{spot.estimatedCost.toLocaleString()}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">訪問時間</div>
            <div className="font-medium">{arrivalTime} - {departureTime}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

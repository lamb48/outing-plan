import Image from "next/image";
import { MapPin, Clock, Wallet, Star } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlacePhotoUrl } from "@/lib/google-places-photos";

interface Spot {
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
  description?: string;
}

interface SpotCardProps {
  spot: Spot;
}

export function SpotCard({ spot }: SpotCardProps) {
  const arrivalTime = new Date(spot.arrivalTime).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const departureTime = new Date(spot.departureTime).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card
      id={`spot-${spot.placeId}`}
      className="group gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
      style={{ scrollMarginTop: "80px" }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2.5">
          <Badge
            variant="secondary"
            className="min-w-8 justify-center rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-sm font-semibold text-gray-900"
          >
            {spot.order}
          </Badge>
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-2 text-base font-semibold text-gray-900">{spot.name}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
              {spot.rating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
                  <span>{spot.rating.toFixed(1)}</span>
                </span>
              )}
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{spot.address}</span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {spot.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">{spot.description}</p>
        )}

        {spot.photoReference && (
          <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={getPlacePhotoUrl(spot.photoReference, 600)}
              alt={spot.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <div className="mb-0.5 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600">
              <Wallet className="h-3.5 w-3.5 text-gray-500" />
              予想費用
            </div>
            <p className="text-sm font-semibold text-gray-900">
              ¥{spot.estimatedCost.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <div className="mb-0.5 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600">
              <Clock className="h-3.5 w-3.5 text-gray-500" />
              滞在時間
            </div>
            <p className="text-sm font-semibold text-gray-900">{spot.estimatedDuration}分</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <p className="mb-0.5 text-xs font-medium text-gray-600">訪問時間</p>
            <p className="text-sm font-semibold text-gray-900">
              {arrivalTime} - {departureTime}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

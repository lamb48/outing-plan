"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Wallet, MapPin, Star } from "lucide-react";

interface PlanHistoryCardProps {
  plan: {
    id: string;
    title: string;
    categories: string[];
    budget: number;
    durationHours: number;
    spotsCount: number;
    thumbnailUrls: string[];
    createdAt?: string;
    averageRating?: number;
  };
}

export function PlanHistoryCard({ plan }: PlanHistoryCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasImageError, setHasImageError] = useState(false);

  const handleImageError = () => {
    // 次の画像候補を試す
    if (currentImageIndex < plan.thumbnailUrls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setHasImageError(false);
    } else {
      // すべての画像で失敗した場合
      setHasImageError(true);
    }
  };

  const currentThumbnailUrl = plan.thumbnailUrls[currentImageIndex];
  const shouldShowImage = currentThumbnailUrl && !hasImageError;

  return (
    <Link href={`/plan/${plan.id}`} className="group block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* サムネイル画像 */}
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {shouldShowImage ? (
            <Image
              src={currentThumbnailUrl}
              alt={plan.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={handleImageError}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {/* カテゴリバッジ */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {plan.categories.map((category, index) => (
              <Badge
                key={index}
                className="border-none bg-white/90 text-xs font-medium text-gray-700"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* カードコンテンツ */}
        <div className="flex flex-1 flex-col p-4">
          {/* タイトル */}
          <h3 className="mb-3 line-clamp-2 text-lg font-semibold text-gray-900">{plan.title}</h3>

          {/* 情報グリッド */}
          <div className="mt-auto grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>¥{plan.budget.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{plan.durationHours}時間</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{plan.spotsCount}スポット</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>{plan.averageRating ? plan.averageRating.toFixed(1) : "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

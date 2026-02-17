"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const PlanMap = dynamic(
  () => import("@/components/plan/PlanMap").then((mod) => ({ default: mod.PlanMap })),
  {
    ssr: false,
    loading: () => (
      <Card className="flex h-[600px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-600">地図を読み込み中...</p>
        </div>
      </Card>
    ),
  },
);

interface Spot {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  order: number;
}

interface PlanMapWrapperProps {
  spots: Spot[];
  className?: string;
}

export function PlanMapWrapper({ spots, className }: PlanMapWrapperProps) {
  return <PlanMap spots={spots} className={className} />;
}

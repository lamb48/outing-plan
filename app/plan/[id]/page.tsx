import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { SpotCard } from "@/components/plan/SpotCard";
import { PlanMapWrapper } from "@/components/plan/PlanMapWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Wallet, Star, AlertCircle, ExternalLink } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SpotWithRoute {
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
}

async function getPlan(planId: string) {
  const supabase = await createClient();

  const { data: plan, error } = await supabase
    .from("plans")
    .select("id, title, budget, categories, duration_hours, area_lat, area_lng, spots, created_at")
    .eq("id", planId)
    .single();

  if (error || !plan) {
    return null;
  }

  return {
    id: plan.id,
    title: plan.title,
    budget: plan.budget,
    categories: plan.categories,
    durationHours: plan.duration_hours,
    areaLat: plan.area_lat,
    areaLng: plan.area_lng,
    spots: plan.spots as unknown as SpotWithRoute[],
    createdAt: plan.created_at,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const plan = await getPlan(id);

  if (!plan) {
    return {
      title: "プランが見つかりません",
    };
  }

  // カテゴリーを結合
  const categoriesText = plan.categories.join("・");

  // スポット数
  const spotsCount = plan.spots.length;

  return {
    title: plan.title,
    description: `${categoriesText} • 予算¥${plan.budget.toLocaleString()} • ${spotsCount}カ所のスポット`,
  };
}

export default async function PlanPage({ params }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const plan = await getPlan(id);

  if (!plan) {
    notFound();
  }

  const totalCost = plan.spots.reduce(
    (sum: number, spot: SpotWithRoute) => sum + spot.estimatedCost,
    0,
  );
  const totalDuration = plan.spots.reduce(
    (sum: number, spot: SpotWithRoute) => sum + spot.estimatedDuration,
    0,
  );

  // 平均評価を計算
  const ratingsWithValue = plan.spots
    .filter((spot: SpotWithRoute) => spot.rating !== undefined && spot.rating !== null)
    .map((spot: SpotWithRoute) => spot.rating!);
  const averageRating =
    ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((sum, rating) => sum + rating, 0) / ratingsWithValue.length
      : undefined;
  const totalDurationHours = Math.round((totalDuration / 60) * 10) / 10;

  // Google Maps URL（全スポットのルート）
  const sortedSpots = [...plan.spots].sort(
    (a: SpotWithRoute, b: SpotWithRoute) => a.order - b.order,
  );
  const gmOrigin = `${sortedSpots[0].lat},${sortedSpots[0].lng}`;
  const gmDestination = `${sortedSpots[sortedSpots.length - 1].lat},${sortedSpots[sortedSpots.length - 1].lng}`;
  const gmWaypoints = sortedSpots
    .slice(1, -1)
    .map((s: SpotWithRoute) => `${s.lat},${s.lng}`)
    .join("|");
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${gmOrigin}&destination=${gmDestination}${gmWaypoints ? `&waypoints=${encodeURIComponent(gmWaypoints)}` : ""}&travelmode=walking`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="container mx-auto max-w-7xl px-4 pt-24 pb-10 md:pt-28">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
          <section className="space-y-4">
            <Card className="gap-0 border border-gray-200 bg-white py-0 shadow-sm">
              <CardHeader className="space-y-2 rounded-t-xl bg-gray-50/60 px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
                <div className="space-y-3">
                  <CardTitle className="text-xl font-semibold text-gray-900 sm:text-2xl md:text-3xl">
                    {plan.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {plan.categories.map((category: string, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="rounded-full border border-cyan-200 bg-cyan-50 text-xs font-medium text-cyan-800"
                      >
                        {category}
                      </Badge>
                    ))}
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800"
                    >
                      <Wallet className="h-3 w-3 text-emerald-600" />
                      予算 ¥{plan.budget.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <div className="h-px bg-gray-100" />
              <CardContent className="space-y-3 px-4 pt-4 pb-4 sm:px-5 sm:pb-5 md:px-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                    <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 sm:text-sm">
                      <Wallet className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                      総費用
                    </div>
                    <p className="text-base font-semibold text-gray-900 sm:text-lg">
                      ¥{totalCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                    <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 sm:text-sm">
                      <Clock className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                      総所要時間
                    </div>
                    <p className="text-base font-semibold text-gray-900 sm:text-lg">
                      {totalDurationHours}時間
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                    <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 sm:text-sm">
                      <MapPin className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                      スポット数
                    </div>
                    <p className="text-base font-semibold text-gray-900 sm:text-lg">
                      {plan.spots.length}カ所
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                    <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 sm:text-sm">
                      <Star className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                      平均評価
                    </div>
                    <p className="text-base font-semibold text-gray-900 sm:text-lg">
                      {averageRating ? averageRating.toFixed(1) : "-"}
                    </p>
                  </div>
                </div>

                {totalCost > plan.budget && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 sm:px-4">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <p className="text-xs font-medium text-rose-700 sm:text-sm">
                      予算を¥{(totalCost - plan.budget).toLocaleString()}超過しています
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3 xl:sticky xl:top-24">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <PlanMapWrapper spots={plan.spots} className="h-[540px] lg:h-[600px]" />
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 xl:hidden"
              >
                <ExternalLink className="h-4 w-4 text-gray-500" />
                Google マップで開く
              </a>
            </div>
          </section>

          <section>
            <div className="space-y-3">
              {plan.spots.map((spot: SpotWithRoute) => (
                <SpotCard key={spot.placeId} spot={spot} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

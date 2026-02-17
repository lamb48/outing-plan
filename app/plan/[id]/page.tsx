import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { SpotCard } from "@/components/plan/SpotCard";
import { PlanMapWrapper } from "@/components/plan/PlanMapWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Wallet, Star, AlertCircle } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="container mx-auto max-w-7xl px-4 pt-28 pb-10">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
          <section className="space-y-4">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="space-y-4 pb-4">
                <div className="space-y-3">
                  <CardTitle className="text-2xl font-semibold text-gray-900 md:text-3xl">
                    {plan.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {plan.categories.map((category: string, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <Badge
                    variant="outline"
                    className="rounded-full border-gray-200 bg-white font-normal"
                  >
                    予算 ¥{plan.budget.toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Wallet className="h-4 w-4 text-gray-500" />
                      総費用
                    </div>
                    <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
                      ¥{totalCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Clock className="h-4 w-4 text-gray-500" />
                      総所要時間
                    </div>
                    <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
                      {totalDurationHours}時間
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      スポット数
                    </div>
                    <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
                      {plan.spots.length}箇所
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Star className="h-4 w-4 text-gray-500" />
                      平均評価
                    </div>
                    <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
                      {averageRating ? averageRating.toFixed(1) : "-"}
                    </p>
                  </div>
                </div>

                {totalCost > plan.budget && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">予算を超えています</p>
                      <p className="text-sm text-amber-800">
                        設定予算より¥{(totalCost - plan.budget).toLocaleString()}超過しています
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="xl:sticky xl:top-24">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <PlanMapWrapper spots={plan.spots} className="h-[540px] lg:h-[600px]" />
              </div>
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

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { HistoryClient } from "@/components/plan/HistoryClient";
import { getPlacePhotoUrl } from "@/lib/google-places-photos";

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

async function getPlanHistory(limit = 12) {
  const supabase = await createClient();

  const {
    data: plans,
    error,
    count,
  } = await supabase
    .from("plans")
    .select("id, title, categories, budget, duration_hours, spots, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching plans:", error);
    throw new Error("プラン履歴の取得に失敗しました");
  }

  const formattedPlans = (plans || []).map((plan) => {
    const spots = plan.spots as unknown as SpotWithRoute[];
    // 画像を持つスポットから最大6件の画像URLを取得
    const thumbnailUrls = spots
      .filter((spot) => spot.photoReference)
      .slice(0, 6)
      .map((spot) => getPlacePhotoUrl(spot.photoReference!, 400));

    return {
      id: plan.id,
      title: plan.title,
      categories: plan.categories,
      budget: plan.budget,
      durationHours: plan.duration_hours,
      spotsCount: spots.length,
      thumbnailUrls,
      createdAt: plan.created_at,
    };
  });

  return {
    plans: formattedPlans,
    pagination: {
      total: count || 0,
      offset: 0,
      limit,
      hasMore: (count || 0) > limit,
    },
  };
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { plans, pagination } = await getPlanHistory();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="relative container mx-auto max-w-7xl px-4 pt-24 pb-8">
        <HistoryClient initialPlans={plans} initialPagination={pagination} />
      </main>
    </div>
  );
}

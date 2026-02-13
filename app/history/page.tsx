import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

interface PlanHistoryItem {
  id: string;
  title: string;
  category: string;
  budget: number;
  durationHours: number;
  spotsCount: number;
  createdAt: string;
}

async function getPlanHistory(limit = 20) {
  const supabase = await createClient();

  const {
    data: plans,
    error,
    count,
  } = await supabase
    .from("plans")
    .select("id, title, category, budget, duration_hours, spots, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching plans:", error);
    throw new Error("プラン履歴の取得に失敗しました");
  }

  const formattedPlans = (plans || []).map((plan) => {
    const spots = plan.spots as unknown as SpotWithRoute[];
    return {
      id: plan.id,
      title: plan.title,
      category: plan.category,
      budget: plan.budget,
      durationHours: plan.duration_hours,
      spotsCount: spots.length,
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
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

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">プラン履歴</h1>
          <p className="text-lg text-gray-600">
            過去に作成したプラン一覧（全{pagination.total}件）
          </p>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">まだプランが作成されていません</p>
              <Link
                href="/"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors"
              >
                プランを作成する
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan: PlanHistoryItem) => (
              <Link key={plan.id} href={`/plan/${plan.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">{plan.category}</Badge>
                      <Badge variant="outline">¥{plan.budget.toLocaleString()}</Badge>
                    </div>
                    <CardTitle className="text-xl line-clamp-2">{plan.title}</CardTitle>
                    <CardDescription>
                      {new Date(plan.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{plan.spotsCount}スポット</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{plan.durationHours}時間</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span>¥{plan.budget.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {pagination.hasMore && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              さらに{pagination.total - pagination.offset - pagination.limit}件のプランがあります
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

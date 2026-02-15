"use client";

import * as React from "react";
import { PlanHistoryCard } from "@/components/plan/PlanHistoryCard";
import { HistorySort, type SortState, type SortDirection } from "@/components/plan/HistorySort";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";

interface PlanHistoryItem {
  id: string;
  title: string;
  categories: string[];
  budget: number;
  durationHours: number;
  spotsCount: number;
  thumbnailUrls: string[];
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

interface HistoryClientProps {
  initialPlans: PlanHistoryItem[];
  initialPagination: PaginationInfo;
}

export function HistoryClient({ initialPlans, initialPagination }: HistoryClientProps) {
  const [plans, setPlans] = React.useState(initialPlans);
  const [pagination, setPagination] = React.useState(initialPagination);
  const [loading, setLoading] = React.useState(false);
  const [requestError, setRequestError] = React.useState<string | null>(null);

  // ソート State
  const [sortState, setSortState] = React.useState<SortState>({
    createdAt: "desc",
    budget: "none",
    duration: "none",
  });

  const observerTarget = React.useRef<HTMLDivElement>(null);

  // 複数条件ソート（優先順位: 作成日 > 予算 > 時間）
  const sortedPlans = React.useMemo(() => {
    if (!plans || plans.length === 0) return [];

    const plansCopy = [...plans];

    return plansCopy.sort((a, b) => {
      // 作成日でソート
      if (sortState.createdAt !== "none") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const comparison = dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
        const result = sortState.createdAt === "asc" ? comparison : -comparison;
        if (result !== 0) return result;
      }

      // 予算でソート
      if (sortState.budget !== "none") {
        const budgetA = a.budget || 0;
        const budgetB = b.budget || 0;
        const comparison = budgetA < budgetB ? -1 : budgetA > budgetB ? 1 : 0;
        const result = sortState.budget === "asc" ? comparison : -comparison;
        if (result !== 0) return result;
      }

      // 時間でソート
      if (sortState.duration !== "none") {
        const durationA = a.durationHours || 0;
        const durationB = b.durationHours || 0;
        const comparison = durationA < durationB ? -1 : durationA > durationB ? 1 : 0;
        return sortState.duration === "asc" ? comparison : -comparison;
      }

      return 0;
    });
  }, [plans, sortState]);

  // 追加読み込み
  const loadMore = React.useCallback(async () => {
    if (loading || !pagination.hasMore) return;

    setLoading(true);
    setRequestError(null);
    try {
      const nextOffset = pagination.offset + pagination.limit;
      const res = await fetch(`/api/plan/history?limit=${pagination.limit}&offset=${nextOffset}`);

      if (!res.ok) {
        throw new Error("履歴の追加読み込みに失敗しました");
      }

      const data = await res.json();

      if (data.success) {
        setPlans((prev) => [...prev, ...data.plans]);
        setPagination((prev) => ({
          ...prev,
          offset: data.pagination.offset,
          hasMore: data.pagination.hasMore,
          total: data.pagination.total,
          limit: data.pagination.limit,
        }));
      }
    } catch (error) {
      console.error("Failed to load more plans:", error);
      setRequestError("読み込みに失敗しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }, [loading, pagination]);

  // Intersection Observer で無限スクロール
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [pagination.hasMore, loading, loadMore]);

  return (
    <>
      {/* ソートUI */}
      <div className="mb-6 flex justify-center md:mt-8 md:justify-end">
        <HistorySort value={sortState} onChange={setSortState} />
      </div>

      {/* プラン一覧 */}
      {sortedPlans.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-600">まだプランが作成されていません</p>
          <p className="mt-2 text-sm text-gray-500">新しいプランを作成してみましょう</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedPlans.map((plan) => (
              <PlanHistoryCard key={plan.id} plan={plan} />
            ))}
          </div>

          {/* Intersection Observer のターゲット */}
          <div ref={observerTarget} className="h-1" />

          {/* ローディング */}
          {loading && <LoadingSpinner />}

          {/* エラー */}
          {requestError && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="mb-3 text-sm text-red-700">{requestError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                再試行
              </Button>
            </div>
          )}

          {/* 手動読み込み */}
          {!loading && pagination.hasMore && (
            <div className="mt-8 text-center">
              <Button
                type="button"
                onClick={loadMore}
                variant="outline"
                className="rounded-full border-cyan-300 bg-white px-6 text-cyan-700 hover:bg-cyan-50"
              >
                さらに読み込む
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Wallet, Clock, Heart, Loader2 } from "lucide-react";
import { FilterCard } from "@/components/plan/FilterCard";
import { BudgetFilterDialog } from "@/components/plan/BudgetFilterDialog";
import { TimeFilterDialog } from "@/components/plan/TimeFilterDialog";
import { CategoryFilterDialog } from "@/components/plan/CategoryFilterDialog";
import { PlacesAutocomplete } from "@/components/plan/PlacesAutocomplete";

const planFormSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().optional(),
  budget: z.number().min(1000).max(100000),
  categories: z.array(z.string()).min(1),
  durationHours: z.number().min(0.5).max(12),
});

type PlanFormData = z.infer<typeof planFormSchema>;

interface SSEEvent {
  status: "collecting" | "selecting" | "timing" | "assembling" | "done" | "error";
  message?: string;
  plan?: { id: string };
  retryAfterSeconds?: number;
}

const STATUS_MESSAGES: Record<string, string> = {
  collecting: "スポットを検索中...",
  selecting: "最適なスポットを選定中...",
  timing: "ルートと時間・費用を計算中...",
  assembling: "プランを整理中...",
};

export function PlanForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);

  const { register, handleSubmit, setValue, watch } = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      budget: 10000,
      categories: ["グルメ"],
      durationHours: 4,
    },
  });

  const budget = watch("budget");
  const durationHours = watch("durationHours");
  const categories = watch("categories");

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("お使いのブラウザは位置情報に対応していません");
      return;
    }

    setIsGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("latitude", position.coords.latitude);
        setValue("longitude", position.coords.longitude);
        setValue("locationName", "現在地");
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setError("位置情報の取得に失敗しました");
        setIsGettingLocation(false);
      },
    );
  };

  const onSubmit = async (data: PlanFormData) => {
    setIsLoading(true);
    setError(null);
    setProgressMessage(STATUS_MESSAGES.collecting);

    try {
      const response = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({}));
        throw new Error((result as { message?: string }).message || "プラン生成に失敗しました");
      }

      // SSE ストリームを読み込む
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // "data: {...}\n\n" 形式のイベントを処理
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice("data: ".length).trim();
          if (!jsonStr) continue;

          let event: SSEEvent;
          try {
            event = JSON.parse(jsonStr) as SSEEvent;
          } catch {
            continue;
          }

          if (event.status === "error") {
            throw new Error(event.message || "プラン生成に失敗しました");
          }

          if (event.status === "done") {
            if (event.plan?.id) {
              router.push(`/plan/${event.plan.id}`);
            }
            return;
          }

          const msg = event.message || STATUS_MESSAGES[event.status] || "";
          if (msg) setProgressMessage(msg);
        }
      }
    } catch (err) {
      console.error("Error generating plan:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setProgressMessage("");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-medium text-red-600 sm:px-6 sm:py-4 sm:text-base">
            {error}
          </div>
        )}

        <PlacesAutocomplete
          value={watch("locationName")}
          onPlaceSelect={(place) => {
            setValue("latitude", place.latitude);
            setValue("longitude", place.longitude);
            setValue("locationName", place.name);
          }}
          disabled={isLoading}
          isGettingLocation={isGettingLocation}
          onGetCurrentLocation={getCurrentLocation}
          submitButton={
            <Button
              type="submit"
              className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold hover:bg-cyan-600 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm md:px-6 md:py-2.5 md:text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {progressMessage || "生成中..."}
                </span>
              ) : (
                "プラン作成"
              )}
            </Button>
          }
        />

        <input type="hidden" {...register("latitude", { valueAsNumber: true })} />
        <input type="hidden" {...register("longitude", { valueAsNumber: true })} />

        <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-3 md:gap-4">
          <FilterCard
            icon={<Wallet size={18} />}
            label="予算"
            value={`¥${budget?.toLocaleString() || "5,000"}`}
            onClick={() => setShowBudgetDialog(true)}
          />
          <FilterCard
            icon={<Clock size={18} />}
            label="滞在時間"
            value={`${durationHours || 4}時間`}
            onClick={() => setShowTimeDialog(true)}
          />
          <FilterCard
            icon={<Heart size={18} />}
            label="興味"
            value={
              categories && categories.length > 0 ? (
                <div className="space-y-1">
                  {categories.map((cat, index) => (
                    <div key={index}>{cat}</div>
                  ))}
                </div>
              ) : (
                "グルメ"
              )
            }
            onClick={() => setShowPreferenceDialog(true)}
          />
        </div>
      </form>

      <BudgetFilterDialog
        open={showBudgetDialog}
        onOpenChange={setShowBudgetDialog}
        value={budget || 10000}
        onChange={(value) => setValue("budget", value)}
      />
      <TimeFilterDialog
        open={showTimeDialog}
        onOpenChange={setShowTimeDialog}
        value={durationHours || 4}
        onChange={(value) => setValue("durationHours", value)}
      />
      <CategoryFilterDialog
        open={showPreferenceDialog}
        onOpenChange={setShowPreferenceDialog}
        value={categories || ["グルメ"]}
        onChange={(value) => setValue("categories", value)}
      />
    </>
  );
}

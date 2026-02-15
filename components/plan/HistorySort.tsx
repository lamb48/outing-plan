"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SortDirection = "none" | "asc" | "desc";

export interface SortState {
  createdAt: SortDirection;
  budget: SortDirection;
  duration: SortDirection;
}

interface HistorySortProps {
  value: SortState;
  onChange: (value: SortState) => void;
}

interface SortButtonProps {
  label: string;
  direction: SortDirection;
  onClick: () => void;
}

function SortButton({ label, direction, onClick }: SortButtonProps) {
  const isActive = direction !== "none";

  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-cyan-500 text-white hover:bg-cyan-600"
          : "border-gray-200 bg-white text-gray-700 hover:border-cyan-300 hover:bg-cyan-50"
      }`}
    >
      <span>{label}</span>
      {direction === "desc" && <ArrowDown className="h-3.5 w-3.5" />}
      {direction === "asc" && <ArrowUp className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function HistorySort({ value, onChange }: HistorySortProps) {
  const cycleSortDirection = (current: SortDirection): SortDirection => {
    if (current === "none") return "desc";
    if (current === "desc") return "asc";
    return "none";
  };

  const handleCreatedAtClick = () => {
    onChange({
      ...value,
      createdAt: cycleSortDirection(value.createdAt),
    });
  };

  const handleBudgetClick = () => {
    onChange({
      ...value,
      budget: cycleSortDirection(value.budget),
    });
  };

  const handleDurationClick = () => {
    onChange({
      ...value,
      duration: cycleSortDirection(value.duration),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SortButton label="作成日" direction={value.createdAt} onClick={handleCreatedAtClick} />
      <SortButton label="予算" direction={value.budget} onClick={handleBudgetClick} />
      <SortButton label="時間" direction={value.duration} onClick={handleDurationClick} />
    </div>
  );
}

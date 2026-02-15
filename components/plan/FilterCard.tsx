import * as React from "react";

interface FilterCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

export function FilterCard({ icon, label, value, onClick, isActive = false }: FilterCardProps) {
  return (
    <button
      type="button"
      className={`flex min-h-[88px] w-full flex-col rounded-xl border p-3 transition-all duration-200 sm:min-h-[100px] sm:p-4 ${
        isActive
          ? "border-cyan-300 bg-cyan-50/80 shadow-md"
          : "border-gray-200 bg-white hover:border-cyan-200 hover:shadow-sm"
      }`}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center gap-1.5 sm:mb-3 sm:gap-2">
        <div className={`text-sm sm:text-base ${isActive ? "text-cyan-600" : "text-gray-500"}`}>
          {icon}
        </div>
        <div
          className={`text-xs font-medium tracking-wider uppercase sm:text-sm ${
            isActive ? "text-cyan-700" : "text-gray-500"
          }`}
        >
          {label}
        </div>
      </div>
      <div className="flex-1" />
      <div
        className={`text-center text-base leading-tight font-semibold sm:text-lg md:text-xl ${
          isActive ? "text-cyan-900" : "text-gray-700"
        }`}
      >
        {value}
      </div>
      <div className="flex-1" />
    </button>
  );
}

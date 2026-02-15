"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";

interface CategoryFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string[];
  onChange: (value: string[]) => void;
}

export function CategoryFilterDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: CategoryFilterDialogProps) {
  const [localValue, setLocalValue] = React.useState<string[]>(value);

  React.useEffect(() => {
    if (open) {
      setLocalValue(value);
    }
  }, [open, value]);

  const toggleCategory = (category: string) => {
    setLocalValue((prev) => {
      if (prev.includes(category)) {
        // 最低1つは選択されている必要がある
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== category);
      }
      return [...prev, category];
    });
  };

  const handleSave = () => {
    onChange(localValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl shadow-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base text-gray-500">
            興味のあるカテゴリを選択してください
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-6 pb-2">
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant="outline"
                className={`justify-start rounded-full focus-visible:ring-0 focus-visible:outline-none ${
                  localValue.includes(cat.value)
                    ? "border-cyan-500 bg-cyan-50 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-600 focus-visible:border-cyan-500"
                    : "hover:bg-transparent hover:text-current"
                }`}
                onClick={() => toggleCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-6"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-full bg-cyan-500 px-6 font-semibold text-white shadow-md hover:bg-cyan-600"
            >
              設定
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

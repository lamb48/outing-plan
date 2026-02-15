"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface TimeFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onChange: (value: number) => void;
}

export function TimeFilterDialog({ open, onOpenChange, value, onChange }: TimeFilterDialogProps) {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    if (open) {
      setLocalValue(value);
    }
  }, [open, value]);

  const handleSave = () => {
    onChange(localValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base text-gray-500">滞在時間を設定してください</DialogTitle>
        </DialogHeader>
        <div className="space-y-8 pt-6 pb-2">
          <div className="space-y-4">
            <div className="flex justify-center items-center">
              <span className="text-4xl font-bold text-gray-700">{localValue}時間</span>
            </div>
            <Slider
              min={0.5}
              max={12}
              step={0.5}
              value={[localValue]}
              onValueChange={(values) => setLocalValue(values[0])}
              className="**:data-[slot=slider-range]:bg-cyan-500 **:data-[slot=slider-thumb]:border-cyan-500 **:data-[slot=slider-thumb]:w-5 **:data-[slot=slider-thumb]:h-5"
            />
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
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-6 shadow-md font-semibold"
            >
              設定
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

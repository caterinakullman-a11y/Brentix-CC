import { useState } from "react";
import { Minus, Plus, Target, ShieldAlert, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AdjustablePriceProps {
  type: "target" | "stop";
  basePrice: number;
  currentPercent: number;
  onSave: (percent: number) => void;
  isLoading?: boolean;
}

export function AdjustablePrice({
  type,
  basePrice,
  currentPercent,
  onSave,
  isLoading,
}: AdjustablePriceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempPercent, setTempPercent] = useState(currentPercent);

  const isTarget = type === "target";
  const Icon = isTarget ? Target : ShieldAlert;
  const label = isTarget ? "TARGET" : "STOP";
  const colorClass = isTarget ? "text-primary" : "text-destructive";
  const bgClass = isTarget ? "bg-primary/10" : "bg-destructive/10";

  // Calculate actual price from percent
  const multiplier = isTarget ? 1 + tempPercent / 100 : 1 - tempPercent / 100;
  const calculatedPrice = basePrice * multiplier;

  // Slider range
  const minPercent = 0.5;
  const maxPercent = isTarget ? 5 : 10;
  const step = 0.5;

  const handleSave = () => {
    onSave(tempPercent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempPercent(currentPercent);
    setIsEditing(false);
  };

  const adjustPercent = (delta: number) => {
    const newValue = Math.max(minPercent, Math.min(maxPercent, tempPercent + delta));
    setTempPercent(newValue);
  };

  // Reset tempPercent when currentPercent changes externally
  if (!isEditing && tempPercent !== currentPercent) {
    setTempPercent(currentPercent);
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          "rounded-lg p-2.5 text-center w-full transition-all",
          "hover:ring-2 hover:ring-offset-2 cursor-pointer",
          bgClass,
          isTarget ? "hover:ring-primary/50" : "hover:ring-destructive/50"
        )}
      >
        <p className={cn("text-[10px] uppercase flex items-center justify-center gap-1", colorClass)}>
          <Icon className="h-3 w-3" />
          {label}
        </p>
        <p className={cn("text-lg font-mono font-bold", colorClass)}>
          ${calculatedPrice.toFixed(2)}
        </p>
        <p className={cn("text-[10px]", colorClass, "opacity-70")}>
          {isTarget ? "+" : "-"}{currentPercent.toFixed(1)}%
        </p>
      </button>
    );
  }

  return (
    <div className={cn("rounded-lg p-2.5 space-y-2", bgClass)}>
      <p className={cn("text-[10px] uppercase flex items-center justify-center gap-1", colorClass)}>
        <Icon className="h-3 w-3" />
        {label}
      </p>
      
      <p className={cn("text-lg font-mono font-bold text-center", colorClass)}>
        ${calculatedPrice.toFixed(2)}
      </p>

      <div className="flex items-center justify-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => adjustPercent(-step)}
          disabled={tempPercent <= minPercent}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <span className={cn("text-sm font-mono font-medium min-w-[50px] text-center", colorClass)}>
          {isTarget ? "+" : "-"}{tempPercent.toFixed(1)}%
        </span>
        
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => adjustPercent(step)}
          disabled={tempPercent >= maxPercent}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Slider
        value={[tempPercent]}
        onValueChange={([value]) => setTempPercent(value)}
        min={minPercent}
        max={maxPercent}
        step={step}
        className="py-1"
      />

      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-7"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          className="flex-1 h-7"
          onClick={handleSave}
          disabled={isLoading}
        >
          <Check className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

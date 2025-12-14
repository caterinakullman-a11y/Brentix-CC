import { Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RiskManagementCardProps {
  stopLossPercent: number;
  takeProfitPercent: number;
  maxPositionSizePercent: number;
  errors: {
    stopLossPercent?: string;
    takeProfitPercent?: string;
    maxPositionSizePercent?: string;
  };
  onStopLossChange: (value: number) => void;
  onTakeProfitChange: (value: number) => void;
  onMaxPositionChange: (value: number) => void;
}

export function RiskManagementCard({
  stopLossPercent,
  takeProfitPercent,
  maxPositionSizePercent,
  errors,
  onStopLossChange,
  onTakeProfitChange,
  onMaxPositionChange,
}: RiskManagementCardProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Shield className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Risk Management</h2>
          <p className="text-sm text-muted-foreground">Position and risk settings</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="stop_loss" className="text-sm font-medium">
            Stop Loss (%)
          </Label>
          <Input
            id="stop_loss"
            type="number"
            value={stopLossPercent}
            onChange={(e) => onStopLossChange(Number(e.target.value))}
            className={cn("mt-2", errors.stopLossPercent && "border-destructive")}
            min={0.1}
            max={100}
            step={0.1}
          />
          {errors.stopLossPercent && (
            <p className="mt-1 text-xs text-destructive">
              {errors.stopLossPercent}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="take_profit" className="text-sm font-medium">
            Take Profit (%)
          </Label>
          <Input
            id="take_profit"
            type="number"
            value={takeProfitPercent}
            onChange={(e) => onTakeProfitChange(Number(e.target.value))}
            className={cn("mt-2", errors.takeProfitPercent && "border-destructive")}
            min={0.1}
            max={100}
            step={0.1}
          />
          {errors.takeProfitPercent && (
            <p className="mt-1 text-xs text-destructive">
              {errors.takeProfitPercent}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="max_position" className="text-sm font-medium">
            Max Position Size (%)
          </Label>
          <Input
            id="max_position"
            type="number"
            value={maxPositionSizePercent}
            onChange={(e) => onMaxPositionChange(Number(e.target.value))}
            className={cn("mt-2", errors.maxPositionSizePercent && "border-destructive")}
            min={0.1}
            max={100}
            step={0.1}
          />
          {errors.maxPositionSizePercent && (
            <p className="mt-1 text-xs text-destructive">
              {errors.maxPositionSizePercent}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

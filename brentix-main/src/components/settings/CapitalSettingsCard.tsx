import { Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CapitalSettingsCardProps {
  initialCapitalSek: number;
  currentCapitalSek: number | null;
  error?: string;
  onInitialCapitalChange: (value: number) => void;
}

export function CapitalSettingsCard({
  initialCapitalSek,
  currentCapitalSek,
  error,
  onInitialCapitalChange,
}: CapitalSettingsCardProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Capital</h2>
          <p className="text-sm text-muted-foreground">Trading capital settings</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="initial_capital" className="text-sm font-medium">
            Initial Capital (SEK)
          </Label>
          <Input
            id="initial_capital"
            type="number"
            value={initialCapitalSek}
            onChange={(e) => onInitialCapitalChange(Number(e.target.value))}
            className={cn("mt-2", error && "border-destructive")}
            min={1000}
          />
          {error && (
            <p className="mt-1 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            Current Capital (SEK)
          </Label>
          <div className="mt-2 rounded-lg bg-muted/50 border border-border px-4 py-2.5">
            <span className="text-lg font-bold font-mono text-foreground">
              {currentCapitalSek?.toLocaleString() ?? "--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

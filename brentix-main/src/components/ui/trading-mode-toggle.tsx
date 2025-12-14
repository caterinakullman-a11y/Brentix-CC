import { cn } from "@/lib/utils";

interface TradingModeToggleProps {
  isPaperTrading: boolean;
  onToggle: (isPaperTrading: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function TradingModeToggle({
  isPaperTrading,
  onToggle,
  disabled = false,
  className,
}: TradingModeToggleProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-52 rounded-full p-1 bg-muted/50 border border-border",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {/* Sliding background indicator */}
      <div
        className={cn(
          "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-out",
          isPaperTrading
            ? "left-1 bg-amber-500"
            : "left-[calc(50%+2px)] bg-destructive"
        )}
      />

      {/* Paper Trading Button */}
      <button
        type="button"
        onClick={() => onToggle(true)}
        disabled={disabled}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full transition-colors duration-200",
          isPaperTrading
            ? "text-amber-950 dark:text-amber-50"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        📝 Paper
      </button>

      {/* Live Trading Button */}
      <button
        type="button"
        onClick={() => onToggle(false)}
        disabled={disabled}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full transition-colors duration-200",
          !isPaperTrading
            ? "text-destructive-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        💰 Live
      </button>
    </div>
  );
}

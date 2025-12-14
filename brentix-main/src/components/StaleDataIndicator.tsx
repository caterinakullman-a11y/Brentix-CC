import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StaleDataIndicatorProps {
  lastUpdated: Date | null;
  staleThresholdMinutes?: number;
}

export function StaleDataIndicator({ 
  lastUpdated, 
  staleThresholdMinutes = 5 
}: StaleDataIndicatorProps) {
  if (!lastUpdated) return null;

  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < staleThresholdMinutes) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">Stale</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Price data is {diffMinutes} minutes old</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

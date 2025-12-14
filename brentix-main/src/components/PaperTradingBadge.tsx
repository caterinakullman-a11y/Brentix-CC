import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PaperTradingBadgeProps {
  enabled: boolean;
}

export function PaperTradingBadge({ enabled }: PaperTradingBadgeProps) {
  if (!enabled) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 cursor-help"
          >
            PAPER
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Paper trading mode - no real money
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { Database, Activity, Clock, Pause, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  usePriceCollectionStatus,
  useTogglePriceCollection,
  useManualPriceFetch,
  usePriceDataCount,
  useLatestPriceTimestamp,
} from "@/hooks/usePriceCollection";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

export function PriceCollectionWidget() {
  const { data: status, isLoading: statusLoading } = usePriceCollectionStatus();
  const { data: totalCount, isLoading: countLoading } = usePriceDataCount();
  const { data: latestTimestamp, isLoading: timestampLoading } = useLatestPriceTimestamp();
  const toggleMutation = useTogglePriceCollection();
  const fetchMutation = useManualPriceFetch();

  const isActive = status?.is_active ?? false;
  const isLoading = statusLoading || countLoading || timestampLoading;

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "Ingen data";
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: sv });
    } catch {
      return "Okänt";
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className={cn(
      "glass-card rounded-xl p-4 animate-slide-up",
      isLoading && "animate-pulse"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Datainsamling</h3>
        </div>
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={cn(
            "text-xs",
            isActive && "bg-green-500/20 text-green-500 border-green-500/30"
          )}
        >
          <span className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5",
            isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
          )} />
          {isActive ? "Aktiv" : "Pausad"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Activity className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wide">Datapunkter</span>
          </div>
          <p className="text-lg font-bold font-mono">
            {countLoading ? "..." : formatCount(totalCount ?? 0)}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wide">Senaste</span>
          </div>
          <p className="text-sm font-medium truncate">
            {timestampLoading ? "..." : formatTimestamp(latestTimestamp)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => toggleMutation.mutate(!isActive)}
          disabled={toggleMutation.isPending || statusLoading}
        >
          {isActive ? (
            <>
              <Pause className="h-3 w-3 mr-1.5" />
              Pausa
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1.5" />
              Starta
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => fetchMutation.mutate()}
          disabled={fetchMutation.isPending}
        >
          <RefreshCw className={cn("h-3 w-3", fetchMutation.isPending && "animate-spin")} />
        </Button>
      </div>

      {fetchMutation.isSuccess && fetchMutation.data?.price && (
        <p className="text-xs text-green-500 mt-2 text-center">
          Hämtade: ${fetchMutation.data.price.toFixed(2)}
        </p>
      )}
    </div>
  );
}

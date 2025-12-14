import { Activity, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueueStats, useRecentQueue, useClearFailedQueue } from "@/hooks/useQueueStats";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function QueueStatusCard() {
  const { data: stats, isLoading: statsLoading } = useQueueStats();
  const { data: recentItems, isLoading: itemsLoading } = useRecentQueue(5);
  const clearFailed = useClearFailedQueue();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-500/20 text-amber-500";
      case "PROCESSING":
        return "bg-blue-500/20 text-blue-500";
      case "COMPLETED":
        return "bg-primary/20 text-primary";
      case "FAILED":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  if (statsLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="h-16 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Execution Queue</h2>
            <p className="text-sm text-muted-foreground">Auto-trade status</p>
          </div>
        </div>
        {stats && stats.failed > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearFailed.mutate()}
            disabled={clearFailed.isPending}
            className="h-8 text-xs gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clear Failed
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-2xl font-bold font-mono" style={{ color: "#fbbf24" }}>
            {stats?.pending ?? 0}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pending
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-2xl font-bold font-mono text-blue-500">
            {stats?.processing ?? 0}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Processing
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-2xl font-bold font-mono text-primary">
            {stats?.completed ?? 0}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Completed
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-2xl font-bold font-mono text-destructive">
            {stats?.failed ?? 0}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Failed
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Recent Activity
        </h3>
        {itemsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : !recentItems || recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No queue activity yet
          </p>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium",
                      getStatusColor(item.status)
                    )}
                  >
                    {item.status}
                  </span>
                  {item.signals && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        item.signals.signal_type === "BUY"
                          ? "text-primary"
                          : "text-destructive"
                      )}
                    >
                      {item.signals.signal_type}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatTime(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

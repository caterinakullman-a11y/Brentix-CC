import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import { useStorageStatus, formatBytes } from "@/hooks/useStorageStatus";
import { cn } from "@/lib/utils";

export function StorageManagementCard() {
  const {
    status,
    isLoading,
    updateLimit,
    isUpdatingLimit,
    runBackfill,
    isBackfilling,
    recalculateStorage,
    isRecalculating,
  } = useStorageStatus();

  const [newLimitMB, setNewLimitMB] = useState(100);

  if (isLoading || !status) {
    return <div className="animate-pulse h-64 bg-muted/20 rounded-xl" />;
  }

  return (
    <Card
      className={cn(
        status.isCritical && "border-destructive",
        status.isWarning && !status.isCritical && "border-yellow-500"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Datalagring
          </div>
          {status.isWarning && (
            <Badge variant={status.isCritical ? "destructive" : "secondary"}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {status.isCritical ? "Kritiskt" : "Varning"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Storage usage */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Använt utrymme</span>
            <span className="font-mono">
              {formatBytes(status.currentBytes)} / {formatBytes(status.maxBytes)}
            </span>
          </div>
          <Progress
            value={status.usedPercent}
            className={cn(
              "h-3",
              status.isCritical && "[&>div]:bg-destructive",
              status.isWarning && !status.isCritical && "[&>div]:bg-yellow-500"
            )}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {status.usedPercent.toFixed(1)}% använt (varning vid{" "}
            {status.warningThreshold}%)
          </p>
        </div>

        {/* Backfill status */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Yahoo Finance Backfill</h4>
          {status.backfillCompleted ? (
            <div className="text-sm text-primary flex items-center gap-2">
              ✅ Klar - {status.backfillRecords.toLocaleString()} datapunkter
              importerade
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Importera historisk data (senaste 60 dagarna)
              </p>
              <Button
                onClick={() => runBackfill()}
                disabled={isBackfilling}
                size="sm"
              >
                {isBackfilling ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importerar...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Starta Backfill
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Expand storage limit */}
        <div className="space-y-2">
          <Label>Lagringsgräns (MB)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={newLimitMB}
              onChange={(e) => setNewLimitMB(parseInt(e.target.value) || 100)}
              min={50}
              max={10000}
              className="w-32"
            />
            <Button
              variant="outline"
              onClick={() => updateLimit(newLimitMB)}
              disabled={isUpdatingLimit}
            >
              {isUpdatingLimit ? "Sparar..." : "Uppdatera"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Nuvarande gräns: {formatBytes(status.maxBytes)}
          </p>
        </div>

        {/* Export statistics */}
        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span>Totalt antal exporter:</span>
            <span className="font-mono">{status.totalExports}</span>
          </div>
          {status.lastExport && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Senaste export:</span>
              <span>
                {new Date(status.lastExport).toLocaleDateString("sv-SE")}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculateStorage()}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Beräkna om
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

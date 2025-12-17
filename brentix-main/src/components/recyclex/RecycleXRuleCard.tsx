import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  Edit2,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  useDeleteRecycleXRule,
  useStartRecycleXRule,
  usePauseRecycleXRule,
  useResumeRecycleXRule,
  useStopRecycleXRule,
} from "@/hooks/useRecycleX";
import type { RecycleXRule } from "@/types/recyclex";
import {
  RECYCLEX_STATUS_COLORS,
  RECYCLEX_TYPE_COLORS,
  getStatusLabel,
} from "@/constants/recyclex";
import { toast } from "sonner";

interface RecycleXRuleCardProps {
  rule: RecycleXRule;
  onEdit: (rule: RecycleXRule) => void;
}

export function RecycleXRuleCard({ rule, onEdit }: RecycleXRuleCardProps) {
  const [expanded, setExpanded] = useState(false);

  const deleteRule = useDeleteRecycleXRule();
  const startRule = useStartRecycleXRule();
  const pauseRule = usePauseRecycleXRule();
  const resumeRule = useResumeRecycleXRule();
  const stopRule = useStopRecycleXRule();

  const handleDelete = async () => {
    if (!confirm("Vill du ta bort denna RecycleX-regel?")) return;
    try {
      await deleteRule.mutateAsync(rule.id);
      toast.success("Regel borttagen");
    } catch {
      toast.error("Kunde inte ta bort regel");
    }
  };

  const handleStart = async () => {
    try {
      await startRule.mutateAsync({ id: rule.id });
      toast.success("Regel startad");
    } catch {
      toast.error("Kunde inte starta regel");
    }
  };

  const handlePause = async () => {
    try {
      await pauseRule.mutateAsync(rule.id);
      toast.success("Regel pausad");
    } catch {
      toast.error("Kunde inte pausa regel");
    }
  };

  const handleResume = async () => {
    try {
      await resumeRule.mutateAsync(rule.id);
      toast.success("Regel återupptagen");
    } catch {
      toast.error("Kunde inte återuppta regel");
    }
  };

  const handleStop = async () => {
    if (!confirm("Vill du stoppa denna regel?")) return;
    try {
      await stopRule.mutateAsync(rule.id);
      toast.success("Regel stoppad");
    } catch {
      toast.error("Kunde inte stoppa regel");
    }
  };

  const progress = rule.config.targetCycles > 0
    ? (rule.state.completedCycles / rule.config.targetCycles) * 100
    : 0;

  const isActive = rule.status === 'ACTIVE';
  const isPaused = rule.status === 'PAUSED';
  const isInactive = rule.status === 'INACTIVE';
  const isWaiting = rule.status === 'WAITING';
  const isCompleted = rule.status === 'COMPLETED';
  const isStopped = rule.status === 'STOPPED';

  const canStart = isInactive;
  const canPause = isActive;
  const canResume = isPaused;
  const canStop = isActive || isPaused || isWaiting;

  const statusColor = RECYCLEX_STATUS_COLORS[rule.status] || 'gray';
  const typeColor = RECYCLEX_TYPE_COLORS[rule.type];

  const isPending = deleteRule.isPending || startRule.isPending || pauseRule.isPending || resumeRule.isPending || stopRule.isPending;

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header with name and badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-foreground truncate">{rule.name}</h3>
              <Badge
                variant="outline"
                style={{ borderColor: typeColor, color: typeColor }}
              >
                {rule.type}
              </Badge>
              <Badge
                variant="outline"
                className={`border-${statusColor}-500 text-${statusColor}-500`}
                style={{
                  borderColor: statusColor === 'green' ? '#5B9A6F' :
                              statusColor === 'red' ? '#9A5B5B' :
                              statusColor === 'yellow' ? '#D4A017' :
                              statusColor === 'blue' ? '#5B7A9A' :
                              statusColor === 'orange' ? '#D4782F' :
                              '#6B7280',
                  color: statusColor === 'green' ? '#5B9A6F' :
                         statusColor === 'red' ? '#9A5B5B' :
                         statusColor === 'yellow' ? '#D4A017' :
                         statusColor === 'blue' ? '#5B7A9A' :
                         statusColor === 'orange' ? '#D4782F' :
                         '#6B7280',
                }}
              >
                {getStatusLabel(rule.status)}
              </Badge>
            </div>

            {/* Progress and stats */}
            <div className="space-y-2">
              {/* Cycle progress */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Cykel:</span>
                <span className="font-medium">
                  {rule.state.completedCycles} / {rule.config.targetCycles}
                </span>
                <Progress value={progress} className="flex-1 h-2" />
              </div>

              {/* Config summary */}
              <div className="text-xs text-muted-foreground font-mono">
                Kapital: {rule.config.capital.toLocaleString()} SEK |
                Mål: {rule.config.targetPercent}% |
                SL: {rule.config.stopLossPercent}%
              </div>

              {/* Profit/Loss */}
              {rule.state.totalProfit !== 0 && (
                <div className="flex items-center gap-2 text-sm">
                  {rule.state.totalProfit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-[#5B9A6F]" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-[#9A5B5B]" />
                  )}
                  <span
                    className={rule.state.totalProfit >= 0 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"}
                  >
                    {rule.state.totalProfit >= 0 ? "+" : ""}
                    {rule.state.totalProfit.toLocaleString()} SEK
                  </span>
                  {rule.state.totalFees > 0 && (
                    <span className="text-muted-foreground">
                      (avgifter: {rule.state.totalFees.toLocaleString()} SEK)
                    </span>
                  )}
                </div>
              )}

              {/* Current capital */}
              {rule.state.currentCapital > 0 && (
                <div className="text-xs text-muted-foreground">
                  Nuvarande kapital: {rule.state.currentCapital.toLocaleString()} SEK
                </div>
              )}

              {/* Error message */}
              {rule.state.lastError && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {rule.state.lastError}
                </div>
              )}
            </div>

            {/* Expand button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Dölj detaljer" : "Visa detaljer"}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {canStart && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#5B9A6F]"
                onClick={handleStart}
                disabled={isPending}
                title="Starta"
              >
                {startRule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            )}
            {canPause && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#D4A017]"
                onClick={handlePause}
                disabled={isPending}
                title="Pausa"
              >
                {pauseRule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
            )}
            {canResume && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#5B9A6F]"
                onClick={handleResume}
                disabled={isPending}
                title="Återuppta"
              >
                {resumeRule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            )}
            {canStop && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#9A5B5B]"
                onClick={handleStop}
                disabled={isPending}
                title="Stoppa"
              >
                {stopRule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(rule)}
              disabled={isPending}
              title="Redigera"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isPending}
              title="Ta bort"
            >
              {deleteRule.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Startläge:</span>{" "}
                <span className="font-medium">
                  {rule.start_mode === 'AUTO' ? 'Automatisk' : 'Manuell'}
                </span>
              </div>
              {rule.start_mode === 'AUTO' && rule.auto_start_price && (
                <div>
                  <span className="text-muted-foreground">Auto-start pris:</span>{" "}
                  <span className="font-medium">{rule.auto_start_price} SEK</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Kapitalläge:</span>{" "}
                <span className="font-medium">
                  {rule.config.capitalMode === 'COMPOUND' ? 'Ackumulerande' : 'Fast'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Cykelåterstart:</span>{" "}
                <span className="font-medium">
                  {rule.config.cycleRestartMode === 'CURRENT_PRICE' ? 'Aktuellt pris' :
                   rule.config.cycleRestartMode === 'WAIT_FOR_REFERENCE' ? 'Vänta på ref.' :
                   'Justerat'}
                </span>
              </div>
              {rule.config.feePerTrade > 0 && (
                <div>
                  <span className="text-muted-foreground">Avgift/trade:</span>{" "}
                  <span className="font-medium">{rule.config.feePerTrade} SEK</span>
                </div>
              )}
              {rule.config.feePercent > 0 && (
                <div>
                  <span className="text-muted-foreground">Avgift %:</span>{" "}
                  <span className="font-medium">{rule.config.feePercent}%</span>
                </div>
              )}
            </div>

            {rule.config.referencePrice > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Referenspris:</span>{" "}
                <span className="font-medium">{rule.config.referencePrice} SEK</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Skapad: {new Date(rule.created_at).toLocaleString('sv-SE')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

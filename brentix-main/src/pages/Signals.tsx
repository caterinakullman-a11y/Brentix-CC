import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Filter, Eye, AlertCircle, Loader2 } from "lucide-react";
import { useRecentSignals } from "@/hooks/useSignals";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const typeColors = {
  BUY: "bg-primary/10 text-primary border-primary/30",
  SELL: "bg-destructive/10 text-destructive border-destructive/30",
  HOLD: "bg-warning/10 text-warning border-warning/30",
};

const statusColors = {
  Aktiv: "bg-primary/20 text-primary",
  Exekverad: "bg-muted text-muted-foreground",
  Ignorerad: "bg-muted/50 text-muted-foreground/70",
};

const typeLabels = {
  BUY: "KÖP",
  SELL: "SÄLJ",
  HOLD: "HÅLL",
};

const strengthLabels = {
  STRONG: "STARK",
  MODERATE: "MÅTTLIG",
  WEAK: "SVAG",
};

const Signals = () => {
  const { signals, isLoading, error } = useRecentSignals(50);

  const getStatus = (signal: typeof signals[0]): "Aktiv" | "Exekverad" | "Ignorerad" => {
    if (signal.is_active) return "Aktiv";
    if (signal.auto_executed || signal.executed_at) return "Exekverad";
    return "Ignorerad";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Signaler</h1>
            <p className="text-sm text-muted-foreground">Historik och hantering av handelssignaler</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Laddar signaler...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
              <AlertCircle className="h-8 w-8 mb-2" />
              <span>Kunde inte ladda signaler</span>
            </div>
          ) : signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
              <span>Inga signaler tillgängliga</span>
              <span className="text-sm">Väntar på att signaler genereras...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Tid
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Styrka
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Pris
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Sannolikhet
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Mål
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {signals.map((signal) => {
                    const status = getStatus(signal);
                    return (
                      <tr
                        key={signal.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                          {format(new Date(signal.timestamp), "yyyy-MM-dd HH:mm", { locale: sv })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn("font-semibold", typeColors[signal.signal_type])}
                          >
                            {typeLabels[signal.signal_type]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {strengthLabels[signal.strength]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                          ${Number(signal.current_price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-primary font-mono">↑{Math.round(signal.probability_up)}%</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-destructive font-mono">↓{Math.round(signal.probability_down)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                          {signal.target_price ? `$${Number(signal.target_price).toFixed(2)}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", statusColors[status])}
                          >
                            {status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="h-4 w-4" />
                            Visa
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Signals;

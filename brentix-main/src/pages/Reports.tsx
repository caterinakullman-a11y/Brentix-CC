import { MainLayout } from "@/components/layout/MainLayout";
import { FileText, Download, Calendar, Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DailyReport {
  id: string;
  date: string;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number | null;
  daily_change_percent: number | null;
  total_signals: number;
  buy_signals: number;
  sell_signals: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number | null;
  net_profit_sek: number | null;
}

const Reports = () => {
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["daily-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_reports")
        .select("*")
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as DailyReport[];
    },
    staleTime: 60000,
  });

  const exportReport = (report: DailyReport) => {
    const content = `
BRENTIX - Daglig Rapport
========================
Datum: ${format(new Date(report.date), "d MMMM yyyy", { locale: sv })}

PRISDATA
--------
Öppning: $${report.open_price?.toFixed(2) || "N/A"}
Högsta:  $${report.high_price?.toFixed(2) || "N/A"}
Lägsta:  $${report.low_price?.toFixed(2) || "N/A"}
Stängning: $${report.close_price?.toFixed(2) || "N/A"}
Förändring: ${report.daily_change_percent?.toFixed(2) || "0"}%

SIGNALER
--------
Totalt: ${report.total_signals}
Köp: ${report.buy_signals}
Sälj: ${report.sell_signals}

TRADES
------
Totalt: ${report.total_trades}
Vinnande: ${report.winning_trades}
Förlorande: ${report.losing_trades}
Win Rate: ${report.win_rate?.toFixed(1) || "0"}%
Netto P/L: ${report.net_profit_sek?.toFixed(2) || "0"} SEK
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brentix-rapport-${report.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rapporter</h1>
            <p className="text-sm text-muted-foreground">
              Dagliga prestationsrapporter och analyser
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Laddar rapporter...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-destructive">
            <AlertCircle className="h-8 w-8 mb-2" />
            <span>Kunde inte ladda rapporter</span>
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <span>Inga rapporter tillgängliga</span>
            <span className="text-sm">Rapporter genereras automatiskt dagligen</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => {
              const isProfit = (report.net_profit_sek || 0) >= 0;
              const isPriceUp = (report.daily_change_percent || 0) >= 0;

              return (
                <div
                  key={report.id}
                  className="glass-card rounded-xl p-5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      isProfit ? "bg-primary/10" : "bg-destructive/10"
                    )}>
                      {isProfit ? (
                        <TrendingUp className="h-6 w-6 text-primary" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-destructive" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Daglig Rapport - {format(new Date(report.date), "d MMMM yyyy", { locale: sv })}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.date), "yyyy-MM-dd")}
                        </span>
                        {report.close_price && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            isPriceUp ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          )}>
                            ${report.close_price.toFixed(2)} ({isPriceUp ? "+" : ""}{report.daily_change_percent?.toFixed(2)}%)
                          </span>
                        )}
                        {report.total_trades > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {report.total_trades} trades
                          </span>
                        )}
                        {report.net_profit_sek !== null && (
                          <span className={cn(
                            "text-xs font-mono font-semibold",
                            isProfit ? "text-primary" : "text-destructive"
                          )}>
                            {isProfit ? "+" : ""}{report.net_profit_sek.toFixed(0)} SEK
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => exportReport(report)}
                  >
                    <Download className="h-4 w-4" />
                    Ladda ner
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Reports;

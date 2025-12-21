import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { usePaperTrades } from "@/hooks/usePaperTrades";
import { PaperTradeAnalysis } from "@/components/paper-history/PaperTradeAnalysis";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  Brain,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

type SortField = "entry_timestamp" | "profit_loss_sek" | "profit_loss_percent" | "position_value_sek";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "OPEN" | "CLOSED";
type InstrumentFilter = "all" | "BULL" | "BEAR";

export default function PaperHistory() {
  const { trades, isLoading } = usePaperTrades();
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [instrumentFilter, setInstrumentFilter] = useState<InstrumentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("entry_timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSortedTrades = useMemo(() => {
    let filtered = [...trades];
    
    // Apply filters
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (instrumentFilter !== "all") {
      filtered = filtered.filter(t => t.instrument_type === instrumentFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.notes?.toLowerCase().includes(query) ||
        t.direction?.toLowerCase().includes(query) ||
        t.instrument_type?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      
      switch (sortField) {
        case "entry_timestamp":
          aVal = new Date(a.entry_timestamp).getTime();
          bVal = new Date(b.entry_timestamp).getTime();
          break;
        case "profit_loss_sek":
          aVal = a.profit_loss_sek || 0;
          bVal = b.profit_loss_sek || 0;
          break;
        case "profit_loss_percent":
          aVal = a.profit_loss_percent || 0;
          bVal = b.profit_loss_percent || 0;
          break;
        case "position_value_sek":
          aVal = a.position_value_sek;
          bVal = b.position_value_sek;
          break;
      }
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return filtered;
  }, [trades, statusFilter, instrumentFilter, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === "CLOSED");
    const totalPL = closed.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0);
    const winningTrades = closed.filter(t => (t.profit_loss_sek || 0) > 0).length;
    const winRate = closed.length > 0 ? (winningTrades / closed.length) * 100 : 0;
    
    return {
      total: trades.length,
      open: trades.filter(t => t.status === "OPEN").length,
      closed: closed.length,
      totalPL,
      winRate,
    };
  }, [trades]);

  return (
    <>
      <Helmet>
        <title>Paper Trade Historik | Brentix</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paper Trade Historik</h1>
            <p className="text-muted-foreground">
              Fullständig historik över dina simulerade trades
            </p>
          </div>
          <Button 
            onClick={() => setShowAnalysis(true)}
            className="gap-2"
            disabled={trades.length === 0}
          >
            <Brain className="h-4 w-4" />
            AI-Analys
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase">Totalt</p>
              <p className="text-2xl font-bold font-mono">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase">Öppna</p>
              <p className="text-2xl font-bold font-mono text-primary">{stats.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase">Stängda</p>
              <p className="text-2xl font-bold font-mono">{stats.closed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase">Total P/L</p>
              <p className={`text-2xl font-bold font-mono ${stats.totalPL >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                {stats.totalPL >= 0 ? '+' : ''}{stats.totalPL.toFixed(0)} SEK
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase">Vinstfrekvens</p>
              <p className={`text-2xl font-bold font-mono ${stats.winRate >= 50 ? 'text-bullish' : 'text-bearish'}`}>
                {stats.winRate.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Filter & Sortering</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="OPEN">Öppna</SelectItem>
                  <SelectItem value="CLOSED">Stängda</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={instrumentFilter} onValueChange={(v) => setInstrumentFilter(v as InstrumentFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Instrument" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="BULL">BULL 🐂</SelectItem>
                  <SelectItem value="BEAR">BEAR 🐻</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Sök i anteckningar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Trades Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredAndSortedTrades.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Inga paper trades hittades</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("entry_timestamp")}
                    >
                      <div className="flex items-center gap-1">
                        Datum
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("position_value_sek")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Belopp
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("profit_loss_sek")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        P/L
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {format(new Date(trade.entry_timestamp), "d MMM HH:mm", { locale: sv })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={trade.direction === "BUY" ? "border-bullish text-bullish" : "border-bearish text-bearish"}
                        >
                          {trade.direction === "BUY" ? (
                            <><TrendingUp className="h-3 w-3 mr-1" />KÖP</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" />SÄLJ</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {trade.instrument_type === "BULL" ? "🐂 BULL" : "🐻 BEAR"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${trade.entry_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {trade.position_value_sek.toFixed(0)} SEK
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.status === "CLOSED" && trade.profit_loss_sek !== null ? (
                          <div className={`font-mono font-medium ${trade.profit_loss_sek >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                            <span>{trade.profit_loss_sek >= 0 ? '+' : ''}{trade.profit_loss_sek.toFixed(0)} SEK</span>
                            <span className="text-xs ml-1">
                              ({trade.profit_loss_percent?.toFixed(1)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={trade.status === "OPEN" ? "default" : "secondary"}
                          className={trade.status === "OPEN" ? "bg-primary/20 text-primary" : ""}
                        >
                          {trade.status === "OPEN" ? "ÖPPEN" : "STÄNGD"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis Modal */}
      <PaperTradeAnalysis
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
      />
    </>
  );
}

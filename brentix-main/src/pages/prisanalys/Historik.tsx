import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHistoricalData,
  exportToCSV,
  type HistoricalDataFilters,
} from "@/hooks/prisanalys/useHistoricalData";
import {
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Database,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const dayNames = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

const PrisanalysHistorik = () => {
  const [filters, setFilters] = useState<HistoricalDataFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data, totalCount, page, pageSize, totalPages, isLoading, setPage, refetch } =
    useHistoricalData({ pageSize: 50, filters });

  const handleFilterChange = (key: keyof HistoricalDataFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleExport = () => {
    const filename = `brent-price-data-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCSV(data, filename);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Historik</h1>
            <p className="text-sm text-muted-foreground">
              Utforska och exportera historisk prisdata
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportera CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Uppdatera
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Filtrera data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="startDate">Från datum</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate?.toISOString().split("T")[0] ?? ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "startDate",
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Till datum</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate?.toISOString().split("T")[0] ?? ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "endDate",
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dayOfWeek">Veckodag</Label>
                  <Select
                    value={filters.dayOfWeek?.toString() ?? "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "dayOfWeek",
                        value === "all" ? null : parseInt(value)
                      )
                    }
                  >
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue placeholder="Alla dagar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla dagar</SelectItem>
                      {dayNames.map((name, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hourOfDay">Timme</Label>
                  <Select
                    value={filters.hourOfDay?.toString() ?? "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "hourOfDay",
                        value === "all" ? null : parseInt(value)
                      )
                    }
                  >
                    <SelectTrigger id="hourOfDay">
                      <SelectValue placeholder="Alla timmar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla timmar</SelectItem>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Rensa filter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Totalt antal</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1">
                {totalCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Uppgångar</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1 text-green-500">
                {data.filter((row) => (row.price_change ?? 0) > 0).length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Nedgångar</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1 text-red-500">
                {data.filter((row) => (row.price_change ?? 0) < 0).length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Visar sida</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1">
                {page} / {totalPages || 1}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tidpunkt</TableHead>
                    <TableHead className="text-right">Öppning</TableHead>
                    <TableHead className="text-right">Högsta</TableHead>
                    <TableHead className="text-right">Lägsta</TableHead>
                    <TableHead className="text-right">Stängning</TableHead>
                    <TableHead className="text-right">Förändring</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Dag</TableHead>
                    <TableHead>Timme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Ingen data hittades
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => {
                      const change = row.price_change ?? 0;
                      const changePercent = row.price_change_percent ?? 0;
                      const isPositive = change > 0;
                      const isNegative = change < 0;

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-sm">
                            {formatTimestamp(row.timestamp)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${row.open.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-500">
                            ${row.high.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-500">
                            ${row.low.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${row.close.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-mono",
                              isPositive && "text-green-500",
                              isNegative && "text-red-500"
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {change.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={isPositive ? "default" : isNegative ? "destructive" : "secondary"}
                              className="font-mono text-xs"
                            >
                              {isPositive ? "+" : ""}
                              {changePercent.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {dayNames[row.day_of_week ?? 0]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {row.hour_of_day?.toString().padStart(2, "0")}:
                            {row.minute_of_hour?.toString().padStart(2, "0")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Visar {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, totalCount)} av {totalCount} rader
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Föregående
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages || isLoading}
                >
                  Nästa
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PrisanalysHistorik;

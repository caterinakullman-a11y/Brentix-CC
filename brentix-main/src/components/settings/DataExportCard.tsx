import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import {
  CalendarIcon,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { useDataExport } from "@/hooks/useDataExport";
import { formatBytes } from "@/hooks/useStorageStatus";

export function DataExportCard() {
  const { exports, isLoading, createExport, isExporting } = useDataExport();

  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [resolution, setResolution] = useState<
    "second" | "minute" | "hour" | "day"
  >("minute");
  const [fileFormat, setFileFormat] = useState<"csv" | "json">("csv");

  const handleExport = () => {
    createExport({
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      resolution,
      format: fileFormat,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportera data
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Från</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateFrom, "d MMM yyyy", { locale: sv })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(d) => d && setDateFrom(d)}
                  disabled={(d) => d > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Till</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateTo, "d MMM yyyy", { locale: sv })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(d) => d && setDateTo(d)}
                  disabled={(d) => d > new Date() || d < dateFrom}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label>Upplösning</Label>
          <Select
            value={resolution}
            onValueChange={(v) =>
              setResolution(v as "second" | "minute" | "hour" | "day")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="second">Per sekund</SelectItem>
              <SelectItem value="minute">Per minut</SelectItem>
              <SelectItem value="hour">Per timme</SelectItem>
              <SelectItem value="day">Per dag</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label>Filformat</Label>
          <RadioGroup
            value={fileFormat}
            onValueChange={(v) => setFileFormat(v as "csv" | "json")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label
                htmlFor="csv"
                className="flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" />
              <Label
                htmlFor="json"
                className="flex items-center gap-1 cursor-pointer"
              >
                <FileJson className="h-4 w-4" />
                JSON
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Export button */}
        <Button onClick={handleExport} disabled={isExporting} className="w-full">
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporterar...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportera data
            </>
          )}
        </Button>

        {/* Previous exports */}
        {!isLoading && exports && exports.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Tidigare exporter</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {exports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                >
                  <div>
                    <span className="font-mono">{exp.resolution}</span>
                    <span className="text-muted-foreground ml-2">
                      {format(new Date(exp.date_from), "d MMM", { locale: sv })}{" "}
                      -{" "}
                      {format(new Date(exp.date_to), "d MMM", { locale: sv })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {exp.record_count && (
                      <Badge variant="outline">
                        {exp.record_count.toLocaleString()} rader
                      </Badge>
                    )}
                    {exp.file_size_bytes && (
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(exp.file_size_bytes)}
                      </span>
                    )}
                    {exp.download_url &&
                      exp.expires_at &&
                      new Date(exp.expires_at) > new Date() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(exp.download_url!, "_blank")
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

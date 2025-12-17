import { useState, useCallback } from "react";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subHours, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type TimePreset = "1H" | "24H" | "1W" | "1M" | "1Y" | "CUSTOM";
export type DataInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w" | "1M";

interface TimeRange {
  from: Date;
  to: Date;
}

interface ChartTimeControlsProps {
  onTimeRangeChange: (range: TimeRange) => void;
  onIntervalChange: (interval: DataInterval) => void;
  selectedPreset?: TimePreset;
  selectedInterval?: DataInterval;
  className?: string;
}

const timePresets: { value: TimePreset; label: string }[] = [
  { value: "1H", label: "1H" },
  { value: "24H", label: "24H" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "1Y", label: "1Y" },
];

const intervalOptions: { value: DataInterval; label: string }[] = [
  { value: "1m", label: "1 minut" },
  { value: "5m", label: "5 minuter" },
  { value: "15m", label: "15 minuter" },
  { value: "1h", label: "1 timme" },
  { value: "4h", label: "4 timmar" },
  { value: "1d", label: "1 dag" },
  { value: "1w", label: "1 vecka" },
  { value: "1M", label: "1 månad" },
];

// Smart interval defaults based on time range
function getDefaultInterval(preset: TimePreset): DataInterval {
  switch (preset) {
    case "1H":
      return "1m";
    case "24H":
      return "15m";
    case "1W":
      return "1h";
    case "1M":
      return "4h";
    case "1Y":
      return "1d";
    case "CUSTOM":
      return "1d";
    default:
      return "1h";
  }
}

function getTimeRangeFromPreset(preset: TimePreset): TimeRange {
  const now = new Date();
  switch (preset) {
    case "1H":
      return { from: subHours(now, 1), to: now };
    case "24H":
      return { from: subDays(now, 1), to: now };
    case "1W":
      return { from: subWeeks(now, 1), to: now };
    case "1M":
      return { from: subMonths(now, 1), to: now };
    case "1Y":
      return { from: subYears(now, 1), to: now };
    default:
      return { from: subDays(now, 1), to: now };
  }
}

export function ChartTimeControls({
  onTimeRangeChange,
  onIntervalChange,
  selectedPreset: externalPreset,
  selectedInterval: externalInterval,
  className,
}: ChartTimeControlsProps) {
  const [activePreset, setActivePreset] = useState<TimePreset>(externalPreset ?? "24H");
  const [interval, setInterval] = useState<DataInterval>(externalInterval ?? getDefaultInterval(externalPreset ?? "24H"));
  const [customRange, setCustomRange] = useState<TimeRange>(() => getTimeRangeFromPreset("24H"));
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const handlePresetClick = useCallback((preset: TimePreset) => {
    setActivePreset(preset);
    const newRange = getTimeRangeFromPreset(preset);
    setCustomRange(newRange);
    onTimeRangeChange(newRange);

    // Set smart default interval
    const newInterval = getDefaultInterval(preset);
    setInterval(newInterval);
    onIntervalChange(newInterval);
  }, [onTimeRangeChange, onIntervalChange]);

  const handleFromDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      const newRange = { from: date, to: customRange.to };
      setCustomRange(newRange);
      setActivePreset("CUSTOM");
      onTimeRangeChange(newRange);
      setFromOpen(false);
    }
  }, [customRange.to, onTimeRangeChange]);

  const handleToDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      const newRange = { from: customRange.from, to: date };
      setCustomRange(newRange);
      setActivePreset("CUSTOM");
      onTimeRangeChange(newRange);
      setToOpen(false);
    }
  }, [customRange.from, onTimeRangeChange]);

  const handleIntervalChange = useCallback((value: DataInterval) => {
    setInterval(value);
    onIntervalChange(value);
  }, [onIntervalChange]);

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 sm:items-center", className)}>
      {/* Time Presets */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {timePresets.map((preset) => (
          <Button
            key={preset.value}
            variant={activePreset === preset.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handlePresetClick(preset.value)}
            className={cn(
              "px-3 transition-colors",
              activePreset === preset.value && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Range */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Från:</span>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[130px] justify-start text-left font-normal",
                !customRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customRange.from ? format(customRange.from, "d MMM yyyy", { locale: sv }) : "Välj datum"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customRange.from}
              onSelect={handleFromDateSelect}
              initialFocus
              disabled={(date) => date > customRange.to || date > new Date()}
            />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">–</span>

        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[130px] justify-start text-left font-normal",
                !customRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customRange.to ? format(customRange.to, "d MMM yyyy", { locale: sv }) : "Välj datum"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customRange.to}
              onSelect={handleToDateSelect}
              initialFocus
              disabled={(date) => date < customRange.from || date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Interval Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Intervall:</span>
        <Select value={interval} onValueChange={(value) => handleIntervalChange(value as DataInterval)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Välj intervall" />
          </SelectTrigger>
          <SelectContent>
            {intervalOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

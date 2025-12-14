import { useState, useMemo } from "react";
import { Check, ChevronDown, TrendingUp, TrendingDown, Zap, Building2, BarChart3, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { 
  BULL_INSTRUMENTS, 
  BEAR_INSTRUMENTS,
  type Instrument 
} from "@/constants/instruments";

interface InstrumentSelectorProps {
  type: "BULL" | "BEAR";
  selectedId: string;
  onSelect: (instrumentId: string) => void;
}

// Get unique values for filters
const LEVERAGE_OPTIONS = [...new Set([...BULL_INSTRUMENTS, ...BEAR_INSTRUMENTS].map(i => i.leverage))].sort((a, b) => a - b);
const ISSUER_OPTIONS = [...new Set([...BULL_INSTRUMENTS, ...BEAR_INSTRUMENTS].map(i => i.issuer))];

export function InstrumentSelector({
  type,
  selectedId,
  onSelect,
}: InstrumentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [leverageFilter, setLeverageFilter] = useState<string>("all");
  const [issuerFilter, setIssuerFilter] = useState<string>("all");
  
  const baseInstruments = type === "BULL" ? BULL_INSTRUMENTS : BEAR_INSTRUMENTS;
  
  // Apply filters
  const instruments = useMemo(() => {
    return baseInstruments.filter(i => {
      if (leverageFilter !== "all" && i.leverage !== parseInt(leverageFilter)) return false;
      if (issuerFilter !== "all" && i.issuer !== issuerFilter) return false;
      return true;
    });
  }, [baseInstruments, leverageFilter, issuerFilter]);

  const selected = baseInstruments.find(i => i.id === selectedId);
  
  const isBull = type === "BULL";
  const Icon = isBull ? TrendingUp : TrendingDown;
  const colorClass = isBull ? "text-primary" : "text-destructive";
  const bgClass = isBull ? "bg-primary/10" : "bg-destructive/10";

  const hasFilters = leverageFilter !== "all" || issuerFilter !== "all";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <span className="text-xl">{isBull ? "🐂" : "🐻"}</span>
        Preferred {type}
      </label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-auto py-3",
              selected && bgClass
            )}
          >
            {selected ? (
              <div className="flex items-center gap-3 text-left">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  bgClass
                )}>
                  <Icon className={cn("h-5 w-5", colorClass)} />
                </div>
                <div>
                  <p className="font-medium">{selected.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      x{selected.leverage}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {selected.issuer}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Välj {type} certifikat...</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[420px] p-0 z-50 bg-popover" align="start">
          <div className="p-3 border-b space-y-3">
            {/* Leverage filter */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>Hävstång</span>
              </div>
              <ToggleGroup 
                type="single" 
                value={leverageFilter} 
                onValueChange={(v) => v && setLeverageFilter(v)}
                className="justify-start flex-wrap"
              >
                <ToggleGroupItem value="all" size="sm" className="text-xs h-7">
                  Alla
                </ToggleGroupItem>
                {LEVERAGE_OPTIONS.map(lev => (
                  <ToggleGroupItem key={lev} value={String(lev)} size="sm" className="text-xs h-7">
                    x{lev}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Issuer filter */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>Utgivare</span>
              </div>
              <ToggleGroup 
                type="single" 
                value={issuerFilter} 
                onValueChange={(v) => v && setIssuerFilter(v)}
                className="justify-start flex-wrap"
              >
                <ToggleGroupItem value="all" size="sm" className="text-xs h-7">
                  Alla
                </ToggleGroupItem>
                {ISSUER_OPTIONS.map(issuer => (
                  <ToggleGroupItem key={issuer} value={issuer} size="sm" className="text-xs h-7">
                    {issuer.replace(" Bank", "")}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {hasFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-7 text-xs"
                onClick={() => { setLeverageFilter("all"); setIssuerFilter("all"); }}
              >
                <Filter className="h-3 w-3 mr-1" />
                Rensa filter
              </Button>
            )}
          </div>

          <Command>
            <CommandInput placeholder={`Sök ${type} certifikat...`} />
            <CommandList>
              <CommandEmpty>Inget certifikat matchar filtren.</CommandEmpty>
              <CommandGroup>
                {instruments.map((instrument) => (
                  <CommandItem
                    key={instrument.id}
                    value={instrument.name}
                    onSelect={() => {
                      onSelect(instrument.id);
                      setOpen(false);
                    }}
                    className="py-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        bgClass
                      )}>
                        <Icon className={cn("h-4 w-4", colorClass)} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{instrument.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            x{instrument.leverage}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{instrument.issuer}</span>
                          {instrument.spreadPercent && (
                            <span>Spread: {instrument.spreadPercent}%</span>
                          )}
                          {instrument.avgVolume && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              {(instrument.avgVolume / 1000).toFixed(0)}k
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        selectedId === instrument.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

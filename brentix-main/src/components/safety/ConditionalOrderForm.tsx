import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateConditionalOrder, ConditionalOrder } from "@/hooks/useSafetyControls";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

const orderSchema = z.object({
  order_type: z.enum(["LIMIT", "STOP", "STOP_LIMIT", "TRAILING_STOP"]),
  direction: z.enum(["BUY", "SELL"]),
  trigger_price: z.number().positive().optional().nullable(),
  limit_price: z.number().positive().optional().nullable(),
  quantity: z.number().positive().min(0.01),
  trailing_percent: z.number().positive().max(100).optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

interface Props {
  onClose: () => void;
  currentPrice?: number;
}

export function ConditionalOrderForm({ onClose, currentPrice = 0 }: Props) {
  const createOrder = useCreateConditionalOrder();
  
  const [form, setForm] = useState({
    order_type: "LIMIT" as ConditionalOrder["order_type"],
    direction: "BUY" as ConditionalOrder["direction"],
    trigger_price: currentPrice || 0,
    limit_price: currentPrice || 0,
    quantity: 1,
    trailing_percent: 2,
    expires_at: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update trigger/limit prices when current price changes
  useEffect(() => {
    if (currentPrice > 0 && form.trigger_price === 0) {
      setForm(prev => ({
        ...prev,
        trigger_price: currentPrice,
        limit_price: currentPrice,
      }));
    }
  }, [currentPrice, form.trigger_price]);

  const handleSubmit = async () => {
    setErrors({});
    
    try {
      const validatedData = orderSchema.parse({
        order_type: form.order_type,
        direction: form.direction,
        trigger_price: form.order_type !== "LIMIT" ? form.trigger_price : null,
        limit_price: ["LIMIT", "STOP_LIMIT"].includes(form.order_type) ? form.limit_price : null,
        quantity: form.quantity,
        trailing_percent: form.order_type === "TRAILING_STOP" ? form.trailing_percent : null,
        expires_at: form.expires_at || null,
      });

      await createOrder.mutateAsync({
        order_type: validatedData.order_type,
        direction: validatedData.direction,
        trigger_price: validatedData.trigger_price,
        limit_price: validatedData.limit_price,
        quantity: validatedData.quantity,
        trailing_percent: validatedData.trailing_percent,
        expires_at: validatedData.expires_at,
        instrument_id: null,
      });

      toast.success("Villkorlig order skapad");
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Kunde inte skapa order");
      }
    }
  };

  // Calculate price distance indicators
  const getPriceDistance = (targetPrice: number) => {
    if (!currentPrice || currentPrice === 0) return null;
    const diff = targetPrice - currentPrice;
    const percent = (diff / currentPrice) * 100;
    return { diff, percent };
  };

  const triggerDistance = form.trigger_price ? getPriceDistance(form.trigger_price) : null;
  const limitDistance = form.limit_price ? getPriceDistance(form.limit_price) : null;

  // Determine if trigger is close (within 1%)
  const isTriggerClose = triggerDistance && Math.abs(triggerDistance.percent) < 1;
  const isTriggerVeryClose = triggerDistance && Math.abs(triggerDistance.percent) < 0.5;

  // For trailing stop, calculate the effective trigger
  const getTrailingInfo = () => {
    if (form.order_type !== "TRAILING_STOP" || !currentPrice) return null;
    
    const trailDistance = currentPrice * (form.trailing_percent / 100);
    if (form.direction === "SELL") {
      // For sell trailing stop, trigger is below current price
      const triggerAt = currentPrice - trailDistance;
      return {
        peakPrice: currentPrice,
        triggerPrice: triggerAt,
        description: `Triggrar om priset faller ${form.trailing_percent}% från toppen (${currentPrice.toFixed(2)})`,
      };
    } else {
      // For buy trailing stop, trigger is above current price
      const triggerAt = currentPrice + trailDistance;
      return {
        troughPrice: currentPrice,
        triggerPrice: triggerAt,
        description: `Triggrar om priset stiger ${form.trailing_percent}% från botten (${currentPrice.toFixed(2)})`,
      };
    }
  };

  const trailingInfo = getTrailingInfo();

  const orderTypeLabels: Record<string, string> = {
    LIMIT: "Limit Order",
    STOP: "Stop Order",
    STOP_LIMIT: "Stop-Limit Order",
    TRAILING_STOP: "Trailing Stop",
  };

  const orderTypeDescriptions: Record<string, string> = {
    LIMIT: "Köp/sälj när priset når en specifik nivå",
    STOP: "Triggas när priset passerar en nivå",
    STOP_LIMIT: "Stop som aktiverar en limit order",
    TRAILING_STOP: "Följer priset dynamiskt och triggar vid vändning",
  };

  const PriceDistanceIndicator = ({ distance, label }: { distance: { diff: number; percent: number } | null; label: string }) => {
    if (!distance) return null;
    
    const isAbove = distance.diff > 0;
    const absPercent = Math.abs(distance.percent);
    
    let colorClass = "text-muted-foreground";
    if (absPercent < 0.5) colorClass = "text-amber-500";
    else if (absPercent < 1) colorClass = "text-amber-400";
    else if (absPercent < 2) colorClass = "text-muted-foreground";
    else colorClass = "text-muted-foreground/70";

    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
        {isAbove ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        <span>{isAbove ? "+" : ""}{distance.percent.toFixed(2)}% från aktuellt pris</span>
        {absPercent < 1 && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 border-amber-500 text-amber-500">
            NÄRA
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
      {/* Current price display with live indicator */}
      {currentPrice > 0 && (
        <div className="flex items-center justify-between bg-background/50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#5B9A6F] animate-pulse" />
            <span className="text-sm text-muted-foreground">Brent Crude (Live)</span>
          </div>
          <span className="font-mono text-lg font-semibold">${currentPrice.toFixed(2)}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Order Type */}
        <div className="space-y-2">
          <Label>Ordertyp</Label>
          <Select
            value={form.order_type}
            onValueChange={(v) => setForm({ ...form, order_type: v as ConditionalOrder["order_type"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(orderTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {orderTypeDescriptions[form.order_type]}
          </p>
        </div>

        {/* Direction */}
        <div className="space-y-2">
          <Label>Riktning</Label>
          <Select
            value={form.direction}
            onValueChange={(v) => setForm({ ...form, direction: v as ConditionalOrder["direction"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#5B9A6F]" />
                  KÖP (Long)
                </div>
              </SelectItem>
              <SelectItem value="SELL">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[#9A5B5B]" />
                  SÄLJ (Short)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger Price - for STOP, STOP_LIMIT, TRAILING_STOP */}
        {form.order_type !== "LIMIT" && form.order_type !== "TRAILING_STOP" && (
          <div className="space-y-2">
            <Label>Triggerpris (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.trigger_price}
              onChange={(e) => setForm({ ...form, trigger_price: parseFloat(e.target.value) || 0 })}
              className={errors.trigger_price ? "border-destructive" : ""}
            />
            {errors.trigger_price && (
              <p className="text-xs text-destructive">{errors.trigger_price}</p>
            )}
            <PriceDistanceIndicator distance={triggerDistance} label="trigger" />
            <p className="text-xs text-muted-foreground">
              {form.direction === "BUY" 
                ? "Order triggas när priset når eller överstiger denna nivå"
                : "Order triggas när priset faller till eller under denna nivå"}
            </p>
          </div>
        )}

        {/* Limit Price - for LIMIT, STOP_LIMIT */}
        {["LIMIT", "STOP_LIMIT"].includes(form.order_type) && (
          <div className="space-y-2">
            <Label>Limitpris (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.limit_price}
              onChange={(e) => setForm({ ...form, limit_price: parseFloat(e.target.value) || 0 })}
              className={errors.limit_price ? "border-destructive" : ""}
            />
            {errors.limit_price && (
              <p className="text-xs text-destructive">{errors.limit_price}</p>
            )}
            <PriceDistanceIndicator distance={limitDistance} label="limit" />
          </div>
        )}

        {/* Trailing Percent - for TRAILING_STOP */}
        {form.order_type === "TRAILING_STOP" && (
          <div className="col-span-2 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trailing avstånd (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={form.trailing_percent}
                  onChange={(e) => setForm({ ...form, trailing_percent: parseFloat(e.target.value) || 2 })}
                  className={errors.trailing_percent ? "border-destructive" : ""}
                />
                {errors.trailing_percent && (
                  <p className="text-xs text-destructive">{errors.trailing_percent}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Antal</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 1 })}
                  className={errors.quantity ? "border-destructive" : ""}
                />
              </div>
            </div>
            
            {/* Trailing stop visualization */}
            {trailingInfo && (
              <div className="bg-background/50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Trailing Stop Info
                </div>
                <p className="text-xs text-muted-foreground">{trailingInfo.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 p-2 rounded">
                    <span className="text-muted-foreground">Startnivå:</span>
                    <span className="font-mono ml-2">${currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <span className="text-muted-foreground">Initial trigger:</span>
                    <span className="font-mono ml-2">${trailingInfo.triggerPrice.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-amber-500/80">
                  Triggerpriset uppdateras automatiskt när priset rör sig i din favör
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quantity - for non-trailing orders */}
        {form.order_type !== "TRAILING_STOP" && (
          <div className="space-y-2">
            <Label>Antal</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 1 })}
              className={errors.quantity ? "border-destructive" : ""}
            />
            {errors.quantity && (
              <p className="text-xs text-destructive">{errors.quantity}</p>
            )}
          </div>
        )}

        {/* Expires At */}
        <div className="space-y-2">
          <Label>Utgångsdatum (valfritt)</Label>
          <Input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Lämna tomt för ingen utgång
          </p>
        </div>
      </div>

      {/* Close trigger warning */}
      {isTriggerVeryClose && form.order_type !== "TRAILING_STOP" && (
        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-500">
            Triggerpriset är mycket nära aktuellt pris - ordern kan triggas snabbt
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          onClick={handleSubmit} 
          disabled={createOrder.isPending}
          className={form.direction === "BUY" ? "bg-[#5B9A6F] hover:bg-[#4a8a5e]" : "bg-[#9A5B5B] hover:bg-[#8a4a4a]"}
        >
          {createOrder.isPending ? "Skapar..." : `Skapa ${form.direction === "BUY" ? "Köp" : "Sälj"}order`}
        </Button>
        <Button variant="outline" onClick={onClose}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}

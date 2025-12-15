import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";
import { useConditionalOrders, useCancelConditionalOrder, ConditionalOrder } from "@/hooks/useSafetyControls";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { TrailingStopChart } from "./TrailingStopChart";
import { usePriceData } from "@/hooks/usePriceData";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useUserSettings } from "@/hooks/useUserSettings";

export function ConditionalOrdersList() {
  const { data: orders, isLoading } = useConditionalOrders();
  const cancelOrder = useCancelConditionalOrder();
  const queryClient = useQueryClient();
  const { currentPrice } = usePriceData();
  const { isEnabled: pushEnabled, sendNotification } = usePushNotifications();
  const { settings } = useUserSettings();

  // Store latest values in refs to avoid recreating subscription
  const notificationRef = useRef({ pushEnabled, sendNotification, settings });
  useEffect(() => {
    notificationRef.current = { pushEnabled, sendNotification, settings };
  }, [pushEnabled, sendNotification, settings]);

  // Real-time subscription for order updates
  useEffect(() => {
    const channel = supabase
      .channel("conditional-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conditional_orders",
        },
        (payload) => {
          console.log("Conditional order update:", payload);
          queryClient.invalidateQueries({ queryKey: ["conditional-orders"] });

          if (payload.eventType === "UPDATE") {
            const newOrder = payload.new as ConditionalOrder & { peak_price?: number; trough_price?: number };
            const newStatus = newOrder.status;
            const { pushEnabled: isPushEnabled, sendNotification: notify, settings: currentSettings } = notificationRef.current;

            if (newStatus === "TRIGGERED") {
              toast.info("Order triggad!", { description: "En villkorlig order har triggats" });

              // Send push notification if enabled
              if (isPushEnabled && currentSettings?.notify_trade_executed && currentSettings?.enable_push_notifications) {
                notify("Order Triggad! 🎯", {
                  body: `Din ${newOrder.order_type} ${newOrder.direction}-order har triggats`,
                  tag: `order-${newOrder.id}`,
                });
              }
            } else if (newStatus === "EXECUTED") {
              toast.success("Order exekverad!", { description: "En villkorlig order har exekverats" });

              if (isPushEnabled && currentSettings?.notify_trade_executed && currentSettings?.enable_push_notifications) {
                notify("Order Exekverad! ✅", {
                  body: `Din ${newOrder.order_type} ${newOrder.direction}-order har exekverats`,
                  tag: `order-${newOrder.id}`,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleCancel = async (id: string) => {
    try {
      await cancelOrder.mutateAsync(id);
      toast.success("Order avbruten");
    } catch {
      toast.error("Kunde inte avbryta order");
    }
  };

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    PENDING: { 
      icon: <Clock className="h-4 w-4" />, 
      color: "text-amber-500", 
      label: "Väntande" 
    },
    TRIGGERED: { 
      icon: <AlertCircle className="h-4 w-4" />, 
      color: "text-primary", 
      label: "Triggad" 
    },
    EXECUTED: { 
      icon: <CheckCircle className="h-4 w-4" />, 
      color: "text-[#5B9A6F]", 
      label: "Exekverad" 
    },
    CANCELLED: { 
      icon: <XCircle className="h-4 w-4" />, 
      color: "text-muted-foreground", 
      label: "Avbruten" 
    },
    EXPIRED: { 
      icon: <Clock className="h-4 w-4" />, 
      color: "text-muted-foreground", 
      label: "Utgången" 
    },
  };

  const orderTypeLabels: Record<string, string> = {
    LIMIT: "Limit",
    STOP: "Stop",
    STOP_LIMIT: "Stop-Limit",
    TRAILING_STOP: "Trailing",
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Inga villkorliga ordrar skapade
      </p>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const otherOrders = orders.filter((o) => o.status !== "PENDING");

  return (
    <div className="space-y-4">
      {/* Pending orders first */}
      {pendingOrders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Aktiva ordrar</h4>
          {pendingOrders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              statusConfig={statusConfig}
              orderTypeLabels={orderTypeLabels}
              onCancel={handleCancel}
              isPending={cancelOrder.isPending}
              currentPrice={currentPrice}
              showChart={true}
            />
          ))}
        </div>
      )}

      {/* Other orders */}
      {otherOrders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Historik</h4>
          {otherOrders.slice(0, 10).map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              statusConfig={statusConfig}
              orderTypeLabels={orderTypeLabels}
              onCancel={handleCancel}
              isPending={cancelOrder.isPending}
              currentPrice={currentPrice}
              showChart={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrderCardProps {
  order: ConditionalOrder;
  statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }>;
  orderTypeLabels: Record<string, string>;
  onCancel: (id: string) => void;
  isPending: boolean;
  currentPrice?: number;
  showChart?: boolean;
}

function OrderCard({ order, statusConfig, orderTypeLabels, onCancel, isPending, currentPrice = 0, showChart = false }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[order.status] || statusConfig.PENDING;
  const extendedOrder = order as ConditionalOrder & { peak_price?: number; trough_price?: number };
  
  const isTrailingStop = order.order_type === "TRAILING_STOP";
  const canShowChart = isTrailingStop && showChart && order.status === "PENDING";

  return (
    <div className="rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className={status.color}>{status.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline"
                className={order.direction === "BUY" 
                  ? "border-[#5B9A6F] text-[#5B9A6F]" 
                  : "border-[#9A5B5B] text-[#9A5B5B]"}
              >
                {order.direction === "BUY" ? "KÖP" : "SÄLJ"}
              </Badge>
              <span className="font-medium text-sm">
                {orderTypeLabels[order.order_type]}
              </span>
              {order.quantity && (
                <span className="text-xs text-muted-foreground">
                  x{order.quantity}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {order.trigger_price && (
                <span>Trigger: ${order.trigger_price.toFixed(2)}</span>
              )}
              {order.limit_price && (
                <span>Limit: ${order.limit_price.toFixed(2)}</span>
              )}
              {order.trailing_percent && (
                <span className="flex items-center gap-1">
                  Trail: {order.trailing_percent}%
                  {extendedOrder.peak_price && (
                    <span className="text-[#5B9A6F]">(Peak: ${extendedOrder.peak_price.toFixed(2)})</span>
                  )}
                  {extendedOrder.trough_price && (
                    <span className="text-[#9A5B5B]">(Trough: ${extendedOrder.trough_price.toFixed(2)})</span>
                  )}
                </span>
              )}
              {order.expires_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(order.expires_at), "d MMM HH:mm", { locale: sv })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canShowChart && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
            </Button>
          )}
          <Badge variant="outline" className={status.color}>
            {status.label}
          </Badge>
          {order.status === "PENDING" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel(order.id)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Trailing Stop Chart */}
      {canShowChart && isExpanded && order.trailing_percent && order.trigger_price && (
        <div className="p-3 pt-0">
          <TrailingStopChart
            currentPrice={currentPrice}
            triggerPrice={order.trigger_price}
            peakPrice={extendedOrder.peak_price}
            troughPrice={extendedOrder.trough_price}
            trailingPercent={order.trailing_percent}
            direction={order.direction}
          />
        </div>
      )}
    </div>
  );
}

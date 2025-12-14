import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConditionalOrder {
  id: string;
  user_id: string;
  instrument_id: string | null;
  order_type: string;
  direction: string;
  trigger_price: number | null;
  limit_price: number | null;
  quantity: number;
  trailing_percent: number | null;
  status: string;
  expires_at: string | null;
  peak_price: number | null;
  trough_price: number | null;
  initial_trigger_price: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing conditional orders...");

    // Get current Brent price from price_data
    const { data: latestPrice, error: priceError } = await supabase
      .from("price_data")
      .select("close, timestamp")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (priceError || !latestPrice) {
      console.error("Failed to get latest price:", priceError);
      return new Response(
        JSON.stringify({ error: "Failed to get latest price" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const currentPrice = latestPrice.close;
    console.log(`Current Brent price: ${currentPrice}`);

    // Get all pending conditional orders
    const { data: pendingOrders, error: ordersError } = await supabase
      .from("conditional_orders")
      .select("*")
      .eq("status", "PENDING");

    if (ordersError) {
      console.error("Failed to fetch pending orders:", ordersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending orders" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log("No pending conditional orders");
      return new Response(
        JSON.stringify({ message: "No pending orders", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingOrders.length} pending orders`);

    let triggeredCount = 0;
    let expiredCount = 0;
    let trailingUpdates = 0;
    const now = new Date();

    for (const order of pendingOrders as ConditionalOrder[]) {
      // Check if order has expired
      if (order.expires_at && new Date(order.expires_at) < now) {
        await supabase
          .from("conditional_orders")
          .update({ status: "EXPIRED", updated_at: now.toISOString() })
          .eq("id", order.id);
        
        console.log(`Order ${order.id} expired`);
        expiredCount++;
        continue;
      }

      let shouldTrigger = false;

      switch (order.order_type) {
        case "LIMIT":
          // LIMIT BUY: trigger when price <= limit_price
          // LIMIT SELL: trigger when price >= limit_price
          if (order.direction === "BUY" && order.limit_price) {
            shouldTrigger = currentPrice <= order.limit_price;
          } else if (order.direction === "SELL" && order.limit_price) {
            shouldTrigger = currentPrice >= order.limit_price;
          }
          break;

        case "STOP":
          // STOP BUY: trigger when price >= trigger_price (breakout)
          // STOP SELL: trigger when price <= trigger_price (stop-loss)
          if (order.direction === "BUY" && order.trigger_price) {
            shouldTrigger = currentPrice >= order.trigger_price;
          } else if (order.direction === "SELL" && order.trigger_price) {
            shouldTrigger = currentPrice <= order.trigger_price;
          }
          break;

        case "STOP_LIMIT":
          // First check trigger, then limit
          if (order.trigger_price && order.limit_price) {
            if (order.direction === "BUY") {
              shouldTrigger = currentPrice >= order.trigger_price && currentPrice <= order.limit_price;
            } else if (order.direction === "SELL") {
              shouldTrigger = currentPrice <= order.trigger_price && currentPrice >= order.limit_price;
            }
          }
          break;

        case "TRAILING_STOP":
          // Dynamic trailing stop logic
          if (order.trailing_percent) {
            // Initialize tracking prices if not set
            let peakPrice = order.peak_price;
            let troughPrice = order.trough_price;
            const initialTrigger = order.initial_trigger_price || order.trigger_price;

            if (order.direction === "SELL") {
              // Trailing stop for SELL (protecting long position)
              // Track peak price and trigger when price drops trailing_percent below peak
              
              if (peakPrice === null || currentPrice > peakPrice) {
                peakPrice = currentPrice;
              }
              
              // Calculate new trigger price based on peak (peakPrice is guaranteed non-null here)
              const newTriggerPrice = (peakPrice as number) * (1 - order.trailing_percent / 100);
              
              // Only update if trigger moved higher (in favor of the trade)
              if (!order.trigger_price || newTriggerPrice > order.trigger_price) {
                console.log(`Trailing SELL: Peak updated to ${peakPrice}, new trigger at ${newTriggerPrice}`);
                
                await supabase
                  .from("conditional_orders")
                  .update({
                    peak_price: peakPrice,
                    trigger_price: newTriggerPrice,
                    initial_trigger_price: initialTrigger,
                    updated_at: now.toISOString(),
                  })
                  .eq("id", order.id);
                
                trailingUpdates++;
              }
              
              // Check if price dropped below trigger
              if (order.trigger_price && currentPrice <= order.trigger_price) {
                shouldTrigger = true;
                console.log(`Trailing SELL triggered: price ${currentPrice} <= trigger ${order.trigger_price}`);
              }
            } else {
              // Trailing stop for BUY (protecting short position)
              // Track trough price and trigger when price rises trailing_percent above trough
              
              if (troughPrice === null || currentPrice < troughPrice) {
                troughPrice = currentPrice;
              }
              
              // Calculate new trigger price based on trough (troughPrice is guaranteed non-null here)
              const newTriggerPrice = (troughPrice as number) * (1 + order.trailing_percent / 100);
              
              // Only update if trigger moved lower (in favor of the trade)
              if (!order.trigger_price || newTriggerPrice < order.trigger_price) {
                console.log(`Trailing BUY: Trough updated to ${troughPrice}, new trigger at ${newTriggerPrice}`);
                
                await supabase
                  .from("conditional_orders")
                  .update({
                    trough_price: troughPrice,
                    trigger_price: newTriggerPrice,
                    initial_trigger_price: initialTrigger,
                    updated_at: now.toISOString(),
                  })
                  .eq("id", order.id);
                
                trailingUpdates++;
              }
              
              // Check if price rose above trigger
              if (order.trigger_price && currentPrice >= order.trigger_price) {
                shouldTrigger = true;
                console.log(`Trailing BUY triggered: price ${currentPrice} >= trigger ${order.trigger_price}`);
              }
            }
          }
          break;
      }

      if (shouldTrigger) {
        console.log(`Triggering order ${order.id}: ${order.order_type} ${order.direction} at ${currentPrice}`);

        // Update order status to triggered
        await supabase
          .from("conditional_orders")
          .update({
            status: "TRIGGERED",
            triggered_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", order.id);

        // Check if user has auto trading enabled
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("auto_trading_enabled, paper_trading_enabled, avanza_account_id")
          .eq("user_id", order.user_id)
          .single();

        // Create execution result
        const executionResult = {
          triggered_price: currentPrice,
          triggered_at: now.toISOString(),
          order_type: order.order_type,
          direction: order.direction,
          quantity: order.quantity,
          paper_mode: userSettings?.paper_trading_enabled ?? true,
          auto_executed: userSettings?.auto_trading_enabled ?? false,
          peak_price: order.peak_price,
          trough_price: order.trough_price,
          initial_trigger: order.initial_trigger_price,
        };

        // If paper trading, simulate execution immediately
        if (userSettings?.paper_trading_enabled) {
          const positionValue = currentPrice * order.quantity;
          
          await supabase.from("paper_trades").insert({
            user_id: order.user_id,
            entry_price: currentPrice,
            entry_timestamp: now.toISOString(),
            quantity: order.quantity,
            position_value_sek: positionValue,
            status: "OPEN",
          });

          await supabase
            .from("conditional_orders")
            .update({
              status: "EXECUTED",
              executed_at: now.toISOString(),
              execution_result: { ...executionResult, simulated: true },
            })
            .eq("id", order.id);

          console.log(`Paper trade executed for order ${order.id}`);
        } else if (userSettings?.auto_trading_enabled && userSettings?.avanza_account_id) {
          await supabase
            .from("conditional_orders")
            .update({
              status: "EXECUTED",
              executed_at: now.toISOString(),
              execution_result: executionResult,
            })
            .eq("id", order.id);
        }

        // Create notification
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          type: "order",
          title: `${order.order_type} Order Triggered`,
          message: `Your ${order.direction} order was triggered at ${currentPrice.toFixed(2)} USD`,
          data: { order_id: order.id, price: currentPrice },
        });

        triggeredCount++;
      }
    }

    console.log(`Processed: ${triggeredCount} triggered, ${expiredCount} expired, ${trailingUpdates} trailing updates`);

    return new Response(
      JSON.stringify({
        message: "Conditional orders processed",
        triggered: triggeredCount,
        expired: expiredCount,
        trailingUpdates,
        currentPrice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing conditional orders:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// ============================================
// BRENTIX - Avanza Trade Execution Edge Function
// ============================================
// File: supabase/functions/process-trade-queue/index.ts
//
// Deploy: npx supabase functions deploy process-trade-queue
// Test:   npx supabase functions invoke process-trade-queue
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================
// CORS Headers
// ============================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// Types
// ============================================
interface AvanzaSession {
  authenticationSession: string;
  customerId: string;
  securityToken: string;
  cookies: string;
}

interface QueueItem {
  id: string;
  signal_id: string;
  user_id: string;
  status: string;
  signals: {
    id: string;
    signal_type: string;
    current_price: number;
    is_active: boolean;
    auto_executed: boolean;
  };
}

interface UserSettings {
  user_id: string;
  auto_trading_enabled: boolean;
  avanza_account_id: string | null;
  avanza_instrument_id: string | null;
  position_size_sek: number;
}

interface OrderResult {
  orderId: string;
  status: string;
  message?: string;
}

// ============================================
// TOTP Generation (RFC 6238)
// ============================================
function base32Decode(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanedInput = encoded.toUpperCase().replace(/\s/g, "").replace(/=+$/, "");
  
  let bits = "";
  for (const char of cleanedInput) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }
  
  return bytes;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

async function generateTOTP(secret: string, timeStep: number = 30): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep);
  
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setBigUint64(0, BigInt(time), false);
  
  const hmac = await hmacSha1(key, new Uint8Array(timeBuffer));
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, "0");
}

// ============================================
// Avanza API Client
// ============================================
const AVANZA_BASE = "https://www.avanza.se";

async function avanzaAuth(
  username: string,
  password: string,
  totpSecret: string
): Promise<AvanzaSession> {
  console.log("[Avanza] Starting authentication...");
  
  // Step 1: Initial login
  const loginRes = await fetch(`${AVANZA_BASE}/_api/authentication/sessions/usercredentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${errorText}`);
  }

  const cookies = loginRes.headers.get("set-cookie") || "";
  const loginData = await loginRes.json();
  
  console.log("[Avanza] Initial login response received");

  // Check if 2FA required
  if (loginData.twoFactorLogin) {
    console.log("[Avanza] 2FA required, generating TOTP...");
    
    const totpCode = await generateTOTP(totpSecret);
    console.log("[Avanza] TOTP generated, verifying...");

    const totpRes = await fetch(`${AVANZA_BASE}/_api/authentication/sessions/totp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Cookie": cookies,
      },
      body: JSON.stringify({
        method: "TOTP",
        totpCode: totpCode,
      }),
    });

    if (!totpRes.ok) {
      const errorText = await totpRes.text();
      throw new Error(`TOTP verification failed (${totpRes.status}): ${errorText}`);
    }

    const totpData = await totpRes.json();
    const securityToken = totpRes.headers.get("x-securitytoken") || "";
    const newCookies = totpRes.headers.get("set-cookie") || "";
    
    console.log("[Avanza] Authentication successful");

    return {
      authenticationSession: totpData.authenticationSession,
      customerId: totpData.customerId,
      securityToken: securityToken,
      cookies: `${cookies}; ${newCookies}`,
    };
  }

  // No 2FA needed (rare)
  return {
    authenticationSession: loginData.authenticationSession,
    customerId: loginData.customerId,
    securityToken: loginRes.headers.get("x-securitytoken") || "",
    cookies: cookies,
  };
}

async function placeAvanzaOrder(
  session: AvanzaSession,
  accountId: string,
  instrumentId: string,
  orderType: "BUY" | "SELL",
  price: number,
  volume: number
): Promise<OrderResult> {
  console.log(`[Avanza] Placing ${orderType} order: ${volume} @ ${price}`);

  const today = new Date().toISOString().split("T")[0];

  const orderPayload = {
    accountId: accountId,
    orderbookId: instrumentId,
    orderType: orderType,
    price: price,
    validUntil: today,
    volume: volume,
  };

  console.log("[Avanza] Order payload:", JSON.stringify(orderPayload));

  const res = await fetch(`${AVANZA_BASE}/_api/trading/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "X-AuthenticationSession": session.authenticationSession,
      "X-SecurityToken": session.securityToken,
      "Cookie": session.cookies,
    },
    body: JSON.stringify(orderPayload),
  });

  const responseText = await res.text();
  console.log(`[Avanza] Order response (${res.status}): ${responseText}`);

  if (!res.ok) {
    throw new Error(`Order failed (${res.status}): ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = { status: "SUBMITTED", message: responseText };
  }

  return {
    orderId: result.orderId || result.orderRequestId || `order-${Date.now()}`,
    status: result.status || result.orderRequestStatus || "SUBMITTED",
    message: result.message || result.messages?.join(", "),
  };
}

// ============================================
// Database Operations
// ============================================
async function getPendingQueueItems(supabase: SupabaseClient): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from("trade_execution_queue")
    .select(`
      id,
      signal_id,
      user_id,
      status,
      signals (
        id,
        signal_type,
        current_price,
        is_active,
        auto_executed
      )
    `)
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    throw new Error(`Failed to fetch queue: ${error.message}`);
  }

  return (data || []) as QueueItem[];
}

async function getUserSettings(supabase: SupabaseClient, userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, auto_trading_enabled, avanza_account_id, avanza_instrument_id, position_size_sek")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error(`Failed to fetch settings for user ${userId}:`, error);
    return null;
  }

  return data as UserSettings;
}

async function updateQueueItem(
  supabase: SupabaseClient,
  itemId: string,
  status: "PROCESSING" | "COMPLETED" | "FAILED",
  result?: object,
  errorMessage?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    processed_at: new Date().toISOString(),
  };

  if (result) update.result = result;
  if (errorMessage) update.error_message = errorMessage;

  await supabase
    .from("trade_execution_queue")
    .update(update)
    .eq("id", itemId);
}

async function updateSignalExecuted(
  supabase: SupabaseClient,
  signalId: string,
  success: boolean,
  result: object
): Promise<void> {
  const update: Record<string, unknown> = {
    execution_result: result,
  };

  if (success) {
    update.auto_executed = true;
    update.executed_at = new Date().toISOString();
  }

  await supabase
    .from("signals")
    .update(update)
    .eq("id", signalId);
}

async function createTradeRecord(
  supabase: SupabaseClient,
  signalId: string,
  signalType: string,
  price: number,
  volume: number,
  orderId: string
): Promise<void> {
  await supabase
    .from("trades")
    .insert({
      signal_id: signalId,
      entry_timestamp: new Date().toISOString(),
      entry_price: price,
      quantity: volume,
      position_value_sek: price * volume,
      status: "OPEN",
      notes: `Auto-executed ${signalType}. Avanza Order ID: ${orderId}`,
    });
}

// ============================================
// Main Handler
// ============================================
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("========================================");
  console.log("[Queue] Starting trade queue processing");
  console.log(`[Queue] Timestamp: ${new Date().toISOString()}`);
  console.log("========================================");

  // Initialize Supabase
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Queue] Missing Supabase credentials");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get Avanza credentials
  const avanzaUsername = Deno.env.get("AVANZA_USERNAME");
  const avanzaPassword = Deno.env.get("AVANZA_PASSWORD");
  const avanzaTotpSecret = Deno.env.get("AVANZA_TOTP_SECRET");

  const hasAvanzaCredentials = !!(avanzaUsername && avanzaPassword && avanzaTotpSecret);
  
  if (!hasAvanzaCredentials) {
    console.warn("[Queue] Avanza credentials not configured - running in dry-run mode");
  }

  // Parse request body for options
  let testMode = false;
  try {
    const body = await req.json();
    testMode = body?.test === true;
  } catch {
    // No body or invalid JSON - that's fine
  }

  if (testMode) {
    console.log("[Queue] Running in TEST mode");
    return new Response(
      JSON.stringify({
        success: true,
        mode: "test",
        avanza_configured: hasAvanzaCredentials,
        message: hasAvanzaCredentials 
          ? "Avanza credentials found, ready for trading" 
          : "Avanza credentials not configured",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Results tracking
  const results: Array<{
    id: string;
    success: boolean;
    orderId?: string;
    error?: string;
  }> = [];
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    // Fetch pending queue items
    console.log("[Queue] Fetching pending items...");
    const queueItems = await getPendingQueueItems(supabase);
    
    if (queueItems.length === 0) {
      console.log("[Queue] No pending items found");
      return new Response(
        JSON.stringify({ 
          processed: 0, 
          success: 0, 
          errors: 0,
          message: "No pending items" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Queue] Found ${queueItems.length} pending items`);

    // Authenticate with Avanza (once for all orders)
    let avanzaSession: AvanzaSession | null = null;
    
    if (hasAvanzaCredentials) {
      try {
        avanzaSession = await avanzaAuth(
          avanzaUsername!,
          avanzaPassword!,
          avanzaTotpSecret!
        );
        console.log("[Queue] Avanza authentication successful");
      } catch (authError) {
        console.error("[Queue] Avanza authentication failed:", authError);
        
        // Mark all items as failed due to auth error
        for (const item of queueItems) {
          await updateQueueItem(supabase, item.id, "FAILED", undefined, `Auth failed: ${(authError as Error).message}`);
          errorCount++;
          results.push({ id: item.id, success: false, error: `Auth failed: ${(authError as Error).message}` });
        }

        return new Response(
          JSON.stringify({
            processed: queueItems.length,
            success: 0,
            errors: errorCount,
            results,
            error: "Avanza authentication failed",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Process each queue item
    for (const item of queueItems) {
      processedCount++;
      console.log(`\n[Queue] Processing item ${processedCount}/${queueItems.length}: ${item.id}`);

      try {
        // Mark as processing
        await updateQueueItem(supabase, item.id, "PROCESSING");

        // Validate signal
        const signal = item.signals;
        if (!signal) {
          throw new Error("Signal not found");
        }
        if (signal.auto_executed) {
          throw new Error("Signal already executed");
        }
        if (!signal.is_active) {
          throw new Error("Signal no longer active");
        }
        if (signal.signal_type === "HOLD") {
          throw new Error("HOLD signals are not executed");
        }

        // Get user settings
        const settings = await getUserSettings(supabase, item.user_id);
        if (!settings) {
          throw new Error("User settings not found");
        }
        if (!settings.auto_trading_enabled) {
          throw new Error("Auto trading disabled for user");
        }
        if (!settings.avanza_account_id) {
          throw new Error("Avanza account ID not configured");
        }

        // Calculate order details
        const price = Number(signal.current_price);
        const positionSize = Number(settings.position_size_sek) || 1000;
        const volume = Math.floor(positionSize / price);

        if (volume < 1) {
          throw new Error(`Calculated volume too small: ${volume} (price: ${price}, size: ${positionSize})`);
        }

        const instrumentId = settings.avanza_instrument_id || "2313155"; // Default: BULL OLJA X15

        console.log(`[Queue] Order details: ${signal.signal_type} ${volume} @ ${price} (instrument: ${instrumentId})`);

        // Execute order
        if (!avanzaSession) {
          throw new Error("Avanza not authenticated - credentials not configured");
        }

        const orderResult = await placeAvanzaOrder(
          avanzaSession,
          settings.avanza_account_id,
          instrumentId,
          signal.signal_type as "BUY" | "SELL",
          price,
          volume
        );

        console.log(`[Queue] Order successful: ${orderResult.orderId}`);

        // Update signal
        await updateSignalExecuted(supabase, signal.id, true, {
          success: true,
          orderId: orderResult.orderId,
          status: orderResult.status,
          volume,
          price,
          executedAt: new Date().toISOString(),
        });

        // Create trade record
        await createTradeRecord(
          supabase,
          signal.id,
          signal.signal_type,
          price,
          volume,
          orderResult.orderId
        );

        // Mark queue item as completed
        await updateQueueItem(supabase, item.id, "COMPLETED", orderResult);

        successCount++;
        results.push({
          id: item.id,
          success: true,
          orderId: orderResult.orderId,
        });

      } catch (itemError) {
        const errorMsg = itemError instanceof Error ? itemError.message : String(itemError);
        console.error(`[Queue] Error processing item ${item.id}:`, errorMsg);

        // Update signal with error
        if (item.signals?.id) {
          await updateSignalExecuted(supabase, item.signals.id, false, {
            success: false,
            error: errorMsg,
            attemptedAt: new Date().toISOString(),
          });
        }

        // Mark queue item as failed
        await updateQueueItem(supabase, item.id, "FAILED", undefined, errorMsg);

        errorCount++;
        results.push({
          id: item.id,
          success: false,
          error: errorMsg,
        });
      }
    }

    console.log("\n========================================");
    console.log(`[Queue] Processing complete: ${successCount}/${processedCount} successful`);
    console.log("========================================\n");

    return new Response(
      JSON.stringify({
        processed: processedCount,
        success: successCount,
        errors: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Queue] Fatal error:", errorMsg);

    return new Response(
      JSON.stringify({
        error: errorMsg,
        processed: processedCount,
        success: successCount,
        errors: errorCount,
        results,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PricePoint {
  timestamp: string;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("Starting Yahoo Finance backfill...");

    // Check if backfill already completed
    const { data: settings, error: settingsError } = await supabase
      .from("storage_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching storage settings:", settingsError);
      throw new Error("Failed to fetch storage settings");
    }

    if (settings?.backfill_completed) {
      console.log("Backfill already completed");
      return new Response(
        JSON.stringify({ 
          message: "Backfill already completed", 
          records: settings.backfill_records_imported 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark backfill as started
    await supabase
      .from("storage_settings")
      .update({ backfill_started_at: new Date().toISOString() })
      .eq("id", settings.id);

    const allPrices: PricePoint[] = [];
    const now = new Date();

    // Fetch in 7-day blocks for minute data (Yahoo limits)
    console.log("Fetching minute data in 7-day blocks...");
    for (let daysBack = 0; daysBack < 60; daysBack += 7) {
      const endDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      try {
        const minuteData = await fetchYahooData("1m", startDate, endDate);
        console.log(`Fetched ${minuteData.length} minute records for days ${daysBack}-${daysBack + 7}`);
        allPrices.push(...minuteData);
      } catch (err) {
        console.error(`Error fetching minute data for days ${daysBack}-${daysBack + 7}:`, err);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Also fetch hourly data for better coverage
    console.log("Fetching hourly data for 60 days...");
    try {
      const hourlyData = await fetchYahooData(
        "1h",
        new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        now
      );
      console.log(`Fetched ${hourlyData.length} hourly records`);
      allPrices.push(...hourlyData);
    } catch (err) {
      console.error("Error fetching hourly data:", err);
    }

    // Deduplicate prices
    const uniquePrices = deduplicatePrices(allPrices);
    console.log(`Total unique prices after deduplication: ${uniquePrices.length}`);

    // Insert in batches
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < uniquePrices.length; i += batchSize) {
      const batch = uniquePrices.slice(i, i + batchSize)
        .filter(p => p.price != null || p.close != null)
        .map(p => ({
          timestamp: p.timestamp,
          open: p.open ?? p.price ?? 0,
          high: p.high ?? p.price ?? 0,
          low: p.low ?? p.price ?? 0,
          close: p.close ?? p.price ?? 0,
          volume: p.volume ?? 0,
          source: "yahoo_backfill",
          data_quality: "good",
        }));

      if (batch.length === 0) continue;

      const { error } = await supabase
        .from("price_data")
        .upsert(batch, { 
          onConflict: "timestamp",
          ignoreDuplicates: true 
        });

      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
      } else {
        totalInserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
      }
    }

    // Mark backfill as completed
    await supabase
      .from("storage_settings")
      .update({
        backfill_completed: true,
        backfill_completed_at: new Date().toISOString(),
        backfill_records_imported: totalInserted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    // Calculate new storage size
    await supabase.rpc("calculate_storage_usage");

    console.log(`Backfill completed: ${totalInserted} records imported`);

    return new Response(
      JSON.stringify({
        success: true,
        records_imported: totalInserted,
        message: `Backfill completed: ${totalInserted} records imported`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchYahooData(interval: string, from: Date, to: Date): Promise<PricePoint[]> {
  const period1 = Math.floor(from.getTime() / 1000);
  const period2 = Math.floor(to.getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=${interval}&period1=${period1}&period2=${period2}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    throw new Error(`Yahoo API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.chart?.result?.[0]) {
    return [];
  }

  const result = data.chart.result[0];
  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};

  return timestamps.map((ts: number, i: number) => ({
    timestamp: new Date(ts * 1000).toISOString(),
    price: quotes.close?.[i] ?? quotes.open?.[i],
    open: quotes.open?.[i],
    high: quotes.high?.[i],
    low: quotes.low?.[i],
    close: quotes.close?.[i],
    volume: quotes.volume?.[i],
  })).filter((p: PricePoint) => p.price != null || p.close != null);
}

function deduplicatePrices(prices: PricePoint[]): PricePoint[] {
  const seen = new Map<string, PricePoint>();
  
  for (const p of prices) {
    if (!seen.has(p.timestamp)) {
      seen.set(p.timestamp, p);
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FREDObservation {
  date: string;
  value: string;
}

interface FREDResponse {
  observations: FREDObservation[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FRED_API_KEY = Deno.env.get("FRED_API_KEY");
    if (!FRED_API_KEY) {
      throw new Error("FRED_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // DCOILBRENTEU = Brent Crude Oil Prices: Europe (Daily)
    const seriesId = "DCOILBRENTEU";
    const startDate = "1987-05-20"; // Data starts from this date
    const endDate = new Date().toISOString().split("T")[0];

    console.log(`Fetching FRED data for ${seriesId} from ${startDate} to ${endDate}...`);

    // Check what we already have
    const { data: existingData } = await supabase
      .from("historical_prices")
      .select("date")
      .order("date", { ascending: false })
      .limit(1);

    const lastDate = existingData?.[0]?.date;
    const fetchStartDate = lastDate 
      ? new Date(new Date(lastDate).getTime() + 86400000).toISOString().split("T")[0]
      : startDate;

    if (fetchStartDate >= endDate) {
      console.log("Historical data is already up to date");
      return new Response(
        JSON.stringify({ message: "Data is already up to date", lastDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching new data from ${fetchStartDate}...`);

    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${fetchStartDate}&observation_end=${endDate}`;

    const response = await fetch(fredUrl);
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
    }

    const data: FREDResponse = await response.json();
    console.log(`Received ${data.observations?.length || 0} observations from FRED`);

    if (!data.observations || data.observations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new data available", lastDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out missing values (FRED uses "." for missing data)
    const validObservations = data.observations.filter(
      (obs) => obs.value !== "." && !isNaN(parseFloat(obs.value))
    );

    console.log(`${validObservations.length} valid observations after filtering`);

    // Insert in batches of 500
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < validObservations.length; i += batchSize) {
      const batch = validObservations.slice(i, i + batchSize).map((obs) => ({
        date: obs.date,
        price: parseFloat(obs.value),
        source: "FRED",
        series_id: seriesId,
      }));

      const { error } = await supabase
        .from("historical_prices")
        .upsert(batch, { onConflict: "date" });

      if (error) {
        console.error(`Batch insert error:`, error);
        throw error;
      }

      insertedCount += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
    }

    // Get total count
    const { count } = await supabase
      .from("historical_prices")
      .select("*", { count: "exact", head: true });

    console.log(`Total records in database: ${count}`);

    return new Response(
      JSON.stringify({
        success: true,
        insertedCount,
        totalRecords: count,
        dateRange: {
          start: validObservations[0]?.date,
          end: validObservations[validObservations.length - 1]?.date,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching historical data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

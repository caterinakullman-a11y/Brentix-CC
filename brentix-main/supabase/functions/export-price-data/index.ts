import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  dateFrom: string;
  dateTo: string;
  resolution: "1M" | "5M" | "15M" | "1H" | "4H" | "1D";
  format: "csv" | "json";
}

interface PriceRow {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
}

// Map resolution to aggregation type
function getAggregationType(resolution: string): "second" | "minute" | "hour" | "day" {
  switch (resolution) {
    case "1M":
    case "5M":
    case "15M":
      return "minute";
    case "1H":
    case "4H":
      return "hour";
    case "1D":
      return "day";
    default:
      return "hour";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Require authentication for all exports
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const body: ExportRequest = await req.json();
    const { dateFrom, dateTo, resolution, format } = body;

    const aggregationType = getAggregationType(resolution);
    console.log(`Export request: ${resolution} (${aggregationType}) ${format} from ${dateFrom} to ${dateTo} for user ${userId}`);

    // Create export record
    const { data: exportRecord, error: insertError } = await supabase
      .from("data_exports")
      .insert({
        user_id: userId,
        export_type: format,
        date_from: dateFrom,
        date_to: dateTo,
        resolution,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }
    
    const exportRecordId = exportRecord?.id;

    // Fetch data
    const { data: prices, error: fetchError } = await supabase
      .from("price_data")
      .select("timestamp, open, high, low, close, volume, source")
      .gte("timestamp", dateFrom)
      .lte("timestamp", dateTo)
      .order("timestamp", { ascending: true });

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }

    console.log(`Fetched ${prices?.length || 0} raw records`);

    // Aggregate if needed
    let outputData: unknown[] = prices || [];
    if (aggregationType !== "second" && prices && prices.length > 0) {
      outputData = aggregateByResolution(prices as PriceRow[], aggregationType, resolution);
    }

    console.log(`Aggregated to ${outputData.length} records`);

    // Format output
    let fileContent: string;
    let contentType: string;
    let fileExtension: string;

    if (format === "csv") {
      fileContent = convertToCSV(outputData);
      contentType = "text/csv";
      fileExtension = "csv";
    } else {
      fileContent = JSON.stringify(outputData, null, 2);
      contentType = "application/json";
      fileExtension = "json";
    }

    const fileSizeBytes = new TextEncoder().encode(fileContent).length;
    
    // Upload to Supabase Storage
    const fileName = `${userId}/brentix_${resolution}_${dateFrom.split("T")[0]}_${dateTo.split("T")[0]}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("data-exports")
      .upload(fileName, fileContent, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Create signed URL (24h validity)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("data-exports")
      .createSignedUrl(fileName, 86400); // 24 hours

    if (urlError) {
      console.error("URL error:", urlError);
      throw urlError;
    }

    await supabase
      .from("data_exports")
      .update({
        status: "completed",
        file_size_bytes: fileSizeBytes,
        record_count: outputData.length,
        download_url: urlData?.signedUrl,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", exportRecordId);

    // Update storage_settings
    await supabase.rpc("increment_exports");
    await supabase
      .from("storage_settings")
      .update({ last_export_at: new Date().toISOString() })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all rows

    console.log(`Export completed: ${outputData.length} records, ${fileSizeBytes} bytes`);

    return new Response(
      JSON.stringify({
        success: true,
        exportId: exportRecordId,
        downloadUrl: urlData?.signedUrl,
        recordCount: outputData.length,
        fileSize: fileSizeBytes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Export error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface AggregatedPrice {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  data_points: number;
}

function aggregateByResolution(prices: PriceRow[], aggregationType: string, resolution: string): AggregatedPrice[] {
  const buckets = new Map<string, {
    timestamp: string;
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    volumes: number[];
  }>();
  
  // Get minutes per bucket based on resolution
  const minutesPerBucket = resolution === "5M" ? 5 : resolution === "15M" ? 15 : 1;

  prices.forEach(p => {
    const date = new Date(p.timestamp);
    let key: string;

    switch (aggregationType) {
      case "minute":
        if (minutesPerBucket > 1) {
          const minutes = Math.floor(date.getMinutes() / minutesPerBucket) * minutesPerBucket;
          date.setMinutes(minutes, 0, 0);
        }
        key = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        break;
      case "hour":
        if (resolution === "4H") {
          const hours = Math.floor(date.getHours() / 4) * 4;
          date.setHours(hours, 0, 0, 0);
        }
        key = date.toISOString().slice(0, 13) + ":00:00.000Z"; // YYYY-MM-DDTHH
        break;
      case "day":
        key = date.toISOString().slice(0, 10) + "T00:00:00.000Z"; // YYYY-MM-DD
        break;
      default:
        key = p.timestamp;
    }

    if (!buckets.has(key)) {
      buckets.set(key, {
        timestamp: key,
        opens: [],
        highs: [],
        lows: [],
        closes: [],
        volumes: [],
      });
    }

    const bucket = buckets.get(key)!;
    bucket.opens.push(p.open);
    bucket.highs.push(p.high);
    bucket.lows.push(p.low);
    bucket.closes.push(p.close);
    bucket.volumes.push(p.volume || 0);
  });

  return Array.from(buckets.values()).map(b => ({
    timestamp: b.timestamp,
    open: b.opens[0],
    high: Math.max(...b.highs),
    low: Math.min(...b.lows),
    close: b.closes[b.closes.length - 1],
    volume: b.volumes.reduce((a, v) => a + v, 0),
    data_points: b.opens.length,
  }));
}

function convertToCSV(data: unknown[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0] as object).join(",");
  const rows = data.map(row =>
    Object.values(row as object)
      .map(v => (typeof v === "string" ? `"${v}"` : v))
      .join(",")
  );

  return [headers, ...rows].join("\n");
}

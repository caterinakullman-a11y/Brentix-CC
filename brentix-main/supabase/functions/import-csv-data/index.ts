import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  timestamp: string;
  close: number;
  source: string;
  timeframe: string;
}

/**
 * Parse CSV data from BCOUSD format
 * Expected format: date,day,timestamp,Close
 * Example: 2020.01.02,Thursday,02:00,66.354
 */
function parseCSV(csvText: string, year: number): CSVRow[] {
  const lines = csvText.trim().split('\n');
  const rows: CSVRow[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 4) continue;

    const [dateStr, , timeStr, closeStr] = parts;
    const close = parseFloat(closeStr);

    if (isNaN(close)) continue;

    // Parse date: 2020.01.02 -> 2020-01-02
    const dateParts = dateStr.split('.');
    if (dateParts.length !== 3) continue;

    const isoDate = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`;

    // Create full timestamp with CET timezone
    // Format: 2020-01-02T02:00:00+01:00
    const timestamp = `${isoDate}T${timeStr}:00+01:00`;

    rows.push({
      timestamp,
      close,
      source: 'csv',
      timeframe: '1min',
    });
  }

  return rows;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { csvData, year, batchSize = 1000, offset = 0 } = body;

    if (!csvData || !year) {
      return new Response(
        JSON.stringify({ error: 'csvData and year are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse CSV
    const allRows = parseCSV(csvData, year);

    if (allRows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid rows found in CSV',
          totalRows: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get batch to process
    const batch = allRows.slice(offset, offset + batchSize);

    if (batch.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All rows processed',
          totalRows: allRows.length,
          processedRows: offset,
          hasMore: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data for insertion
    const insertData = batch.map(row => ({
      timestamp: row.timestamp,
      close: row.close,
      open: row.close,
      high: row.close,
      low: row.close,
      source: row.source,
      timeframe: row.timeframe,
      data_quality: 'good',
    }));

    // Insert with upsert to handle duplicates
    const { data, error } = await supabase
      .from('price_data')
      .upsert(insertData, {
        onConflict: 'timestamp,source,timeframe',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          code: error.code
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const nextOffset = offset + batch.length;
    const hasMore = nextOffset < allRows.length;

    return new Response(
      JSON.stringify({
        success: true,
        year,
        totalRows: allRows.length,
        processedRows: nextOffset,
        batchInserted: batch.length,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
        message: hasMore
          ? `Processed ${nextOffset}/${allRows.length} rows. Call again with offset=${nextOffset}`
          : `Import complete! ${allRows.length} rows processed.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

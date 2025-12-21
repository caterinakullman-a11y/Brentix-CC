/**
 * CSV Import Script for Brentix
 * Imports minute data from CSV files to price_data table
 *
 * CSV Format: date,day,timestamp,Close
 * Example: 2020.01.02,Thursday,02:00,66.354
 */

const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://vaoddzhefpthybuglxfp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

// Batch size for inserts (Supabase has limits)
const BATCH_SIZE = 500;

// CSV files to import
const CSV_FILES = [
  'BCOUSD_M1_2020_CET_FIXED_FINAL.csv',
  'BCOUSD_M1_2021_CET_FIXED_FINAL.csv',
  'BCOUSD_M1_2022_CET_FIXED_FINAL.csv',
  'BCOUSD_M1_2023_CET_FIXED_FINAL.csv',
  'BCOUSD_M1_2024_CET_FIXED_FINAL.csv',
  'BCOUSD_M1_2025_CET_FIXED_FINAL.csv',
];

const DATA_DIR = path.join(__dirname, 'data');

/**
 * Parse CSV date and time to ISO timestamp
 * Input: date=2020.01.02, time=02:00
 * Output: 2020-01-02T02:00:00+01:00 (CET timezone)
 */
function parseTimestamp(dateStr, timeStr) {
  // date format: YYYY.MM.DD
  const [year, month, day] = dateStr.split('.');
  // time format: HH:MM
  const [hour, minute] = timeStr.split(':');

  // Create ISO timestamp with CET timezone offset (+01:00)
  // Note: CET is UTC+1, CEST (summer) is UTC+2
  // For simplicity, using +01:00 as the files are labeled CET
  return `${year}-${month}-${day}T${hour}:${minute}:00+01:00`;
}

/**
 * Parse a single CSV line
 */
function parseLine(line) {
  const parts = line.split(',');
  if (parts.length < 4) return null;

  const [dateStr, , timeStr, closeStr] = parts;

  // Skip header row
  if (dateStr === 'date') return null;

  const close = parseFloat(closeStr);
  if (isNaN(close)) return null;

  const timestamp = parseTimestamp(dateStr, timeStr);

  return {
    timestamp,
    open: close,    // Use close as OHLC since we only have close
    high: close,
    low: close,
    close,
    volume: null,
    source: 'csv_import',
    data_quality: 'good'
  };
}

/**
 * Insert batch of records to Supabase
 */
async function insertBatch(records, batchNumber, totalBatches) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/price_data`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=ignore-duplicates'  // Skip duplicates
    },
    body: JSON.stringify(records)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Batch ${batchNumber}/${totalBatches} failed: ${response.status} - ${error}`);
  }

  return response;
}

/**
 * Process a single CSV file
 */
async function processFile(filename) {
  const filepath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return { file: filename, imported: 0, skipped: 0, errors: 1 };
  }

  console.log(`\nProcessing: ${filename}`);

  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log(`  Total lines: ${lines.length}`);

  const records = [];
  let skipped = 0;

  for (const line of lines) {
    const record = parseLine(line);
    if (record) {
      records.push(record);
    } else {
      skipped++;
    }
  }

  console.log(`  Valid records: ${records.length}`);
  console.log(`  Skipped: ${skipped}`);

  // Insert in batches
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      await insertBatch(batch, batchNum, totalBatches);
      imported += batch.length;

      // Progress update every 10 batches
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        console.log(`  Batch ${batchNum}/${totalBatches} - ${imported} records imported`);
      }
    } catch (error) {
      console.error(`  Error in batch ${batchNum}: ${error.message}`);
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return { file: filename, imported, skipped, errors };
}

/**
 * Main import function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('BRENTIX CSV IMPORT');
  console.log('Importing minute data to price_data table');
  console.log('Using service_role key (bypasses RLS)');
  console.log('='.repeat(60));

  const results = [];
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const file of CSV_FILES) {
    const result = await processFile(file);
    results.push(result);
    totalImported += result.imported;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));

  for (const result of results) {
    console.log(`${result.file}: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`);
  }

  console.log('-'.repeat(60));
  console.log(`TOTAL: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`);
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);

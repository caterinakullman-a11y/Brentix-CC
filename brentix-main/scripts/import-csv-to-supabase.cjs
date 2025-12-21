/**
 * CSV Import Script for Brentix
 * Imports BCOUSD minute data from CSV files to Supabase price_data table
 *
 * Usage: node scripts/import-csv-to-supabase.cjs [year]
 * Example: node scripts/import-csv-to-supabase.cjs 2020
 *
 * If no year is specified, imports all years (2020-2025)
 */

const fs = require('fs');
const path = require('path');

// Supabase config
const SUPABASE_URL = 'https://vaoddzhefpthybuglxfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQzOTUsImV4cCI6MjA4MTA0MDM5NX0.cQTt4yIjMX3QyDBVsZzNPIsv3uoK7BHjEHC41_cr__4';

const BATCH_SIZE = 500;
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Parse CSV file and return array of price data objects
 */
function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const rows = [];

  // Skip header
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
    const timestamp = `${isoDate}T${timeStr}:00+01:00`;

    rows.push({
      timestamp,
      close,
      open: close,
      high: close,
      low: close,
      source: 'csv',
      timeframe: '1min',
      data_quality: 'good'
    });
  }

  return rows;
}

/**
 * Insert batch of rows to Supabase
 */
async function insertBatch(rows, token) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/price_data`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=ignore-duplicates'
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Insert failed: ${response.status} - ${error}`);
  }

  return true;
}

/**
 * Get auth token
 */
async function getAuthToken() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'caterina.kullman@gmail.com',
      password: 'Brentix1122!!'
    })
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Import a single year
 */
async function importYear(year, token) {
  const fileName = `BCOUSD_M1_${year}_CET_FIXED_FINAL.csv`;
  const filePath = path.join(DATA_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${fileName}`);
    return 0;
  }

  console.log(`  Parsing ${fileName}...`);
  const rows = parseCSVFile(filePath);
  console.log(`  Found ${rows.length} rows`);

  let imported = 0;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      await insertBatch(batch, token);
      imported += batch.length;

      // Progress indicator
      const percent = ((batchNum / totalBatches) * 100).toFixed(1);
      process.stdout.write(`\r  Importing: ${percent}% (${imported}/${rows.length})`);
    } catch (error) {
      console.error(`\n  Error at batch ${batchNum}: ${error.message}`);
      // Continue with next batch
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\n  Completed: ${imported} rows imported`);
  return imported;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const specificYear = args[0] ? parseInt(args[0]) : null;

  const years = specificYear ? [specificYear] : [2020, 2021, 2022, 2023, 2024, 2025];

  console.log('=== Brentix CSV Import ===\n');
  console.log('Authenticating...');

  let token;
  try {
    token = await getAuthToken();
    console.log('Authentication successful\n');
  } catch (error) {
    console.error('Authentication failed:', error.message);
    process.exit(1);
  }

  let totalImported = 0;

  for (const year of years) {
    console.log(`\nImporting ${year}:`);
    const count = await importYear(year, token);
    totalImported += count;
  }

  console.log('\n=== Import Complete ===');
  console.log(`Total rows imported: ${totalImported}`);
}

main().catch(console.error);

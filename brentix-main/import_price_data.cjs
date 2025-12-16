const https = require('https');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'vaoddzhefpthybuglxfp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac';

const DATA_DIR = path.join(__dirname, 'data');
const BATCH_SIZE = 500;

/**
 * Check if date is in Central European Summer Time (CEST)
 * CEST: Last Sunday of March at 02:00 to Last Sunday of October at 03:00
 */
function isCEST(year, month, day, hour) {
  const lastSundayOfMarch = getLastSunday(year, 3);
  const lastSundayOfOctober = getLastSunday(year, 10);

  // April to September: always CEST
  if (month > 3 && month < 10) return true;
  // November to February: always CET
  if (month < 3 || month > 10) return false;

  // March: CEST starts at 02:00 on last Sunday
  if (month === 3) {
    if (day > lastSundayOfMarch) return true;
    if (day === lastSundayOfMarch && hour >= 2) return true;
    return false;
  }

  // October: CET starts at 03:00 on last Sunday (clock goes back from 03:00 to 02:00)
  if (month === 10) {
    if (day < lastSundayOfOctober) return true;
    if (day === lastSundayOfOctober && hour < 3) return true;
    return false;
  }

  return false;
}

function getLastSunday(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  const date = new Date(year, month - 1, lastDay);
  const dayOfWeek = date.getDay();
  return lastDay - dayOfWeek;
}

/**
 * Convert CSV row to Supabase price_data format
 */
function parseRow(row, rowNum) {
  const parts = row.split(',');
  if (parts.length < 4) return null;

  const [dateStr, , timeStr, closeStr] = parts;

  if (!dateStr || !timeStr || !closeStr) return null;

  // Parse date: 2025.01.02 -> 2025-01-02
  const dateParts = dateStr.split('.');
  if (dateParts.length !== 3) return null;

  const [year, month, dayNum] = dateParts;

  // Parse time: 02:00 -> 02:00:00
  const timeParts = timeStr.split(':');
  if (timeParts.length < 2) return null;

  const [hour, minute] = timeParts;

  // Determine timezone offset based on DST
  const yearInt = parseInt(year);
  const monthInt = parseInt(month);
  const dayInt = parseInt(dayNum);
  const hourInt = parseInt(hour);

  const offset = isCEST(yearInt, monthInt, dayInt, hourInt) ? '+02:00' : '+01:00';

  // Create ISO timestamp
  const timestamp = `${year}-${month}-${dayNum}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00${offset}`;

  const close = parseFloat(closeStr);
  if (isNaN(close)) return null;

  return {
    timestamp: timestamp,
    open: close,
    high: close,
    low: close,
    close: close,
    volume: null,
    source: 'csv_import',
    _rowNum: rowNum  // For debugging
  };
}

/**
 * Insert batch of records - simple insert, no duplicate handling
 */
async function insertBatch(records) {
  // Remove internal metadata before sending
  const cleanRecords = records.map(r => {
    const { _rowNum, ...rest } = r;
    return rest;
  });

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(cleanRecords);

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/price_data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(data),
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, count: records.length });
        } else {
          resolve({ success: false, status: res.statusCode, error: body, records });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Read all lines from CSV file
 */
function readCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  return lines.slice(1); // Skip header
}

/**
 * Process a single CSV file - insert ALL rows without any filtering
 */
async function processFile(filePath) {
  console.log(`\nProcessing: ${path.basename(filePath)}`);

  const lines = readCSVFile(filePath);
  const totalLines = lines.length;

  let batch = [];
  let totalRows = 0;
  let successRows = 0;
  let parseErrors = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const record = parseRow(line, i + 2);  // +2 for 1-indexed and header row

    if (record) {
      batch.push(record);
      totalRows++;

      if (batch.length >= BATCH_SIZE) {
        const result = await insertBatch(batch);

        if (result.success) {
          successRows += batch.length;
        } else {
          console.error(`\n  Batch error at row ${totalRows}: ${result.error}`);
          // Continue anyway - don't stop on errors
        }

        process.stdout.write(`\r  Progress: ${totalRows}/${totalLines} (${Math.round(totalRows/totalLines*100)}%)...`);
        batch = [];
      }
    } else {
      parseErrors++;
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    const result = await insertBatch(batch);

    if (result.success) {
      successRows += batch.length;
    } else {
      console.error(`\n  Final batch error: ${result.error}`);
    }
  }

  console.log(`\n  Completed: ${successRows} inserted, ${parseErrors} parse errors`);
  return { total: totalRows, success: successRows, parseErrors: parseErrors };
}

/**
 * Get count of existing records
 */
async function getRecordCount() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/price_data?select=count',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const count = res.headers['content-range'];
        if (count) {
          const match = count.match(/\/(\d+)/);
          resolve(match ? parseInt(match[1]) : 0);
        } else {
          resolve(0);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Main function - imports ALL CSV rows without any filtering
 */
async function main() {
  console.log('='.repeat(60));
  console.log('BRENT CRUDE PRICE DATA IMPORTER');
  console.log('='.repeat(60));

  // Check existing records
  const existingCount = await getRecordCount();
  console.log(`\nExisting records in price_data: ${existingCount}`);

  // Find all CSV files
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('BCOUSD_M1_') && f.endsWith('.csv'))
    .sort()
    .map(f => path.join(DATA_DIR, f));

  console.log(`\nFound ${files.length} CSV files to import:`);
  files.forEach(f => console.log(`  - ${path.basename(f)}`));

  // Count total expected rows
  let expectedTotal = 0;
  for (const file of files) {
    const lines = readCSVFile(file);
    expectedTotal += lines.length;
  }
  console.log(`\nTotal rows to import: ${expectedTotal}`);

  // Process each file
  let totalSuccess = 0;
  let totalParseErrors = 0;

  for (const file of files) {
    const result = await processFile(file);
    totalSuccess += result.success;
    totalParseErrors += result.parseErrors;
  }

  // Final count
  const finalCount = await getRecordCount();

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Expected rows: ${expectedTotal}`);
  console.log(`Successfully inserted: ${totalSuccess}`);
  console.log(`Parse errors: ${totalParseErrors}`);
  console.log(`Records in database: ${finalCount}`);

  if (finalCount === expectedTotal) {
    console.log(`\n✓ SUCCESS: All ${expectedTotal} rows imported!`);
  } else {
    console.log(`\n⚠ MISMATCH: Expected ${expectedTotal}, got ${finalCount} (diff: ${expectedTotal - finalCount})`);
  }
}

// Run
main().catch(console.error);

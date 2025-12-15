const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://vaoddzhefpthybuglxfp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

    const data = JSON.stringify({ sql_query: sql });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: body });
        } else {
          resolve({ success: false, error: body, status: res.statusCode });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function checkTable(tableName) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ exists: true });
        } else if (res.statusCode === 404 || body.includes('PGRST205')) {
          resolve({ exists: false });
        } else {
          resolve({ exists: false, error: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function main() {
  console.log('Checking existing tables...');

  const tablesToCheck = ['price_data', 'signals', 'profiles', 'user_roles', 'paper_trades'];

  for (const table of tablesToCheck) {
    const result = await checkTable(table);
    console.log(`Table ${table}: ${result.exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
  }

  // Create exec_sql function first if it doesn't exist
  console.log('\nAttempting to check/create necessary structures...');

  // Try to directly access tables to see what exists
  const profilesCheck = await checkTable('profiles');
  console.log(`\nProfiles table exists: ${profilesCheck.exists}`);

  if (!profilesCheck.exists) {
    console.log('\nMigrations need to be run. Please run them via Supabase Dashboard SQL Editor.');
    console.log('Migration files are in: /workspaces/Brentix-CC/brentix-main/migrations/');
    console.log('\nOrder to run:');
    console.log('1. 01_core_tables.sql');
    console.log('2. 02_additional_tables.sql');
    console.log('3. 03_rls_policies.sql');
    console.log('4. 04_functions_triggers.sql');
    console.log('5. 05_trade_queue.sql');
    console.log('6. 06_profiles_roles.sql');
    console.log('7. 07_paper_trading.sql');
    console.log('8. 08_patterns_history.sql');
    console.log('9. 09_trading_rules.sql');
    console.log('10. 10_safety_advanced.sql');
  } else {
    console.log('\nCore tables already exist!');
  }
}

main().catch(console.error);

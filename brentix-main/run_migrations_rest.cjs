const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'vaoddzhefpthybuglxfp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac';

// First, create exec_sql function via the SQL endpoint
async function createExecSqlFunction() {
  const sql = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql_query TEXT)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSON;
    BEGIN
      EXECUTE sql_query;
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
  `;

  return executeSQL(sql);
}

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(data),
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Use the database REST endpoint directly for creating tables
async function runMigrationViaRest(sql, description) {
  return new Promise((resolve, reject) => {
    // Try using the pg_query endpoint if available
    const data = JSON.stringify({ sql_query: sql });

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/pg/query',
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
        resolve({ status: res.statusCode, body, description });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function checkEndpoints() {
  console.log('Checking available Supabase endpoints...\n');

  const endpoints = [
    '/rest/v1/',
    '/pg/query',
    '/graphql/v1',
    '/auth/v1/health'
  ];

  for (const endpoint of endpoints) {
    const result = await new Promise((resolve) => {
      const options = {
        hostname: SUPABASE_URL,
        port: 443,
        path: endpoint,
        method: 'GET',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ endpoint, status: res.statusCode, body: body.substring(0, 100) }));
      });

      req.on('error', (e) => resolve({ endpoint, status: 'error', body: e.message }));
      req.end();
    });

    console.log(`${endpoint}: ${result.status}`);
    if (result.status !== 200 && result.status !== 404) {
      console.log(`  Response: ${result.body}`);
    }
  }
}

async function main() {
  await checkEndpoints();

  console.log('\n--- Attempting to run migration via REST ---\n');

  // Try a simple CREATE TABLE
  const testSQL = `
    CREATE TABLE IF NOT EXISTS public.test_migration (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const result = await runMigrationViaRest(testSQL, 'Test table creation');
  console.log('Result:', result.status, result.body.substring(0, 200));
}

main().catch(console.error);

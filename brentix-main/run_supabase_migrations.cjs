const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

// Using Supabase Pooler (IPv4 available) - Session mode on port 5432
const DATABASE_URL = 'postgresql://postgres.vaoddzhefpthybuglxfp:DdJeW9K4Leee3m1Fd@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const MIGRATIONS_DIR = '/workspaces/Brentix-CC/brentix-main/migrations';

const MIGRATION_FILES = [
  '01_core_tables.sql',
  '02_additional_tables.sql',
  '03_rls_policies.sql',
  '04_functions_triggers.sql',
  '05_trade_queue.sql',
  '06_profiles_roles.sql',
  '07_paper_trading.sql',
  '08_patterns_history.sql',
  '09_trading_rules.sql',
  '10_safety_advanced.sql'
];

async function runMigrations() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected successfully!\n');

    for (const file of MIGRATION_FILES) {
      const filePath = path.join(MIGRATIONS_DIR, file);

      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} - file not found`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`  ✓ ${file} completed successfully\n`);
      } catch (err) {
        console.log(`  ✗ ${file} failed: ${err.message}`);
        // Continue with next migration even if one fails
        // Some migrations might have dependencies already created
      }
    }

    // Verify tables exist
    console.log('\nVerifying tables...');
    const tables = ['price_data', 'signals', 'profiles', 'user_roles', 'paper_trades'];

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`, [table]);
        const exists = result.rows[0].exists;
        console.log(`  ${exists ? '✓' : '✗'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      } catch (err) {
        console.log(`  ✗ ${table}: Error checking - ${err.message}`);
      }
    }

  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConnection closed.');
  }
}

runMigrations();

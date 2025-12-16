const https = require('https');

const SUPABASE_URL = 'vaoddzhefpthybuglxfp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac';

async function getCountForYear(year) {
  return new Promise((resolve, reject) => {
    const nextYear = year + 1;
    const path = `/rest/v1/price_data?select=count&timestamp=gte.${year}-01-01T00:00:00Z&timestamp=lt.${nextYear}-01-01T00:00:00Z`;

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const range = res.headers['content-range'];
        if (range) {
          const match = range.match(/\/(\d+)/);
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

async function getDateRange() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/price_data?select=timestamp&order=timestamp.asc&limit=1',
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
        try {
          const data = JSON.parse(body);
          resolve(data[0]?.timestamp || 'N/A');
        } catch {
          resolve('N/A');
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getLatestDate() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/price_data?select=timestamp&order=timestamp.desc&limit=1',
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
        try {
          const data = JSON.parse(body);
          resolve(data[0]?.timestamp || 'N/A');
        } catch {
          resolve('N/A');
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // CSV counts (from earlier analysis)
  const csvCounts = {
    2020: 319110,
    2021: 321327,
    2022: 322902,
    2023: 282131,
    2024: 318193,
    2025: 296875
  };

  console.log('='.repeat(70));
  console.log('DATA COMPLETENESS ANALYSIS');
  console.log('='.repeat(70));
  console.log('');
  console.log('Year     CSV Rows    DB Rows     Diff      Coverage');
  console.log('-'.repeat(70));

  let totalCSV = 0;
  let totalDB = 0;

  for (const year of [2020, 2021, 2022, 2023, 2024, 2025]) {
    const dbCount = await getCountForYear(year);
    const csvCount = csvCounts[year];
    const diff = csvCount - dbCount;
    const coverage = ((dbCount / csvCount) * 100).toFixed(2);

    totalCSV += csvCount;
    totalDB += dbCount;

    console.log(`${year}     ${csvCount.toString().padEnd(11)} ${dbCount.toString().padEnd(11)} ${diff.toString().padStart(6)}    ${coverage}%`);
  }

  console.log('-'.repeat(70));
  const totalDiff = totalCSV - totalDB;
  const totalCoverage = ((totalDB / totalCSV) * 100).toFixed(2);
  console.log(`TOTAL    ${totalCSV.toString().padEnd(11)} ${totalDB.toString().padEnd(11)} ${totalDiff.toString().padStart(6)}    ${totalCoverage}%`);

  console.log('');
  console.log('Date Range in Database:');
  console.log(`  First record: ${await getDateRange()}`);
  console.log(`  Last record:  ${await getLatestDate()}`);
}

main().catch(console.error);

const https = require('https');

const SUPABASE_URL = 'vaoddzhefpthybuglxfp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac';

async function getCount() {
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

async function getIds(limit) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/price_data?select=id&limit=${limit}`,
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
          resolve(data.map(r => r.id));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function deleteIds(ids) {
  return new Promise((resolve, reject) => {
    const idsParam = ids.map(id => `"${id}"`).join(',');
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/price_data?id=in.(${idsParam})`,
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
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
    req.end();
  });
}

async function main() {
  const BATCH_SIZE = 5000;

  console.log('Deleting all data from price_data table...');

  let count = await getCount();
  console.log(`Starting count: ${count}`);

  while (count > 0) {
    const ids = await getIds(BATCH_SIZE);
    if (ids.length === 0) break;

    await deleteIds(ids);
    count = await getCount();
    process.stdout.write(`\rRemaining: ${count}    `);
  }

  console.log('\nDone! Final count:', await getCount());
}

main().catch(console.error);

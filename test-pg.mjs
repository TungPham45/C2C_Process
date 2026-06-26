import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres:123456@127.0.0.1:5433/product_db',
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM products');
  console.log('PG module count (127.0.0.1):', res.rows.length);
  await client.end();
}
run().catch(console.error);

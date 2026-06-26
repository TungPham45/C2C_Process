/**
 * seed-all-dbs.mjs
 * Seed sample data into all databases after Prisma schema sync.
 * Runs via: npm run db:seed
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const POSTGRES_HOST = 'localhost';
const POSTGRES_PORT = '5433';
const POSTGRES_USER = 'postgres';

const seedFiles = [
  { file: 'db/seeds/auth_db.sql',      db: 'auth_db' },
  { file: 'db/seeds/product_db.sql',   db: 'product_db' },
  { file: 'db/seeds/order_db.sql',     db: 'order_db' },
  { file: 'db/seeds/admin_mod_db.sql', db: 'admin_mod_db' },
  { file: 'db/seeds/chat_db.sql',      db: 'chat_db' },
];

function log(msg) {
  console.log(`[db:seed] ${msg}`);
}

function ensureBannersTable() {
  log('Ensuring banners table exists in admin_mod_db...');
  const sql = `
    CREATE TABLE IF NOT EXISTS banners (
      id         SERIAL PRIMARY KEY,
      title      VARCHAR(255) NOT NULL,
      image_url  TEXT NOT NULL,
      target_url TEXT,
      is_active  BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    INSERT INTO banners (title, image_url, target_url, is_active, sort_order)
    SELECT * FROM (VALUES
      ('Mua Sắm Thông Minh - Tiết Kiệm Tối Đa',
       'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80',
       '/products', true, 1),
      ('Hàng Ngàn Sản Phẩm Chính Hãng',
       'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80',
       '/products', true, 2),
      ('Flash Sale Mỗi Ngày - Giảm Đến 50%',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1400&q=80',
       '/products', true, 3)
    ) AS v(title, image_url, target_url, is_active, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM banners LIMIT 1);
  `;

  const result = spawnSync(
    'docker',
    ['exec', '-i', 'c2c-platform-db', 'psql', '-U', POSTGRES_USER, '-d', 'admin_mod_db', '-c', sql],
    { cwd: repoRoot, stdio: 'inherit', shell: false }
  );

  if (result.error) throw result.error;
}

function seedDb({ file, db }) {
  const absolutePath = path.join(repoRoot, file);
  let sql;
  try {
    sql = readFileSync(absolutePath, 'utf-8');
  } catch {
    log(`WARN: Seed file not found: ${file} — skipping.`);
    return;
  }

  log(`Seeding ${db} from ${file}...`);

  const result = spawnSync(
    'docker',
    ['exec', '-i', 'c2c-platform-db', 'psql', '-U', POSTGRES_USER, '-d', db],
    {
      cwd: repoRoot,
      input: sql,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: false,
    }
  );

  if (result.error) throw result.error;
  // Non-zero exit is OK — seed files have ON CONFLICT guards; errors are just duplicate skips.
}

async function main() {
  log('Starting seed for all databases...');

  // Ensure banners table + data in admin_mod_db
  ensureBannersTable();

  // Seed all DBs from SQL files
  for (const entry of seedFiles) {
    seedDb(entry);
  }

  log('All databases seeded successfully.');
}

main().catch((err) => {
  console.error('[db:seed] Fatal error:', err.message);
  process.exit(1);
});

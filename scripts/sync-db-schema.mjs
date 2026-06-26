import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';

const schemaFiles = [
  'libs/prisma-clients/auth-client/schema.prisma',
  'libs/prisma-clients/product-client/schema.prisma',
  'libs/prisma-clients/order-client/schema.prisma',
  'libs/prisma-clients/chat-client/schema.prisma',
  'libs/prisma-clients/admin-mod-client/schema.prisma',
];

function run(command, args, stepName) {
  console.log(`\n[db:sync] ${stepName}`);
  console.log(`[db:sync] > ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureFileExists(relativePath, hint) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`[db:sync] Missing required file: ${relativePath}`);
    console.error(`[db:sync] ${hint}`);
    process.exit(1);
  }
}

function waitForPort({ host, port, timeoutMs }) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(
            new Error(
              `PostgreSQL is not reachable at ${host}:${port}. Start Docker first with "docker compose up -d postgres".`
            )
          );
          return;
        }

        setTimeout(attempt, 1000);
      });
    };

    attempt();
  });
}

async function main() {
  ensureFileExists('package.json', 'Run this command from the repository root.');

  for (const schemaFile of schemaFiles) {
    ensureFileExists(schemaFile, 'Prisma schema files are required to sync the databases.');
  }

  console.log('[db:sync] Waiting for PostgreSQL on postgres:5432');
  await waitForPort({ host: '127.0.0.1', port: 5433, timeoutMs: 60_000 });

  for (const schemaFile of schemaFiles) {
    run(
      npxCommand,
      ['prisma', 'db', 'push', `--schema=${schemaFile}`, '--accept-data-loss'],
      `Applying db push for ${schemaFile}`
    );
  }

  run(npmCommand, ['run', 'prisma:generate'], 'Regenerating Prisma clients');

  console.log('\n[db:sync] Completed successfully.');
}

main().catch((error) => {
  console.error(`\n[db:sync] ${error.message}`);
  process.exit(1);
});

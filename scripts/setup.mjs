import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const dockerCommand = isWindows ? 'docker.exe' : 'docker';

function run(command, args, stepName) {
  console.log(`\n[setup] ${stepName}`);
  console.log(`[setup] > ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
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
    console.error(`[setup] Missing required file: ${relativePath}`);
    console.error(`[setup] ${hint}`);
    process.exit(1);
  }
}

function main() {
  ensureFileExists('package.json', 'Run this command from the repository root.');
  ensureFileExists('docker-compose.yml', 'The setup script requires docker-compose.yml in the repo root.');

  console.log('[setup] Bootstrapping C2C Platform');
  console.log(
    '[setup] This will install dependencies, start PostgreSQL, apply pending Prisma migrations, and regenerate Prisma clients.'
  );

  run(npmCommand, ['install'], 'Installing dependencies');
  run(dockerCommand, ['compose', 'up', '-d', 'postgres'], 'Starting PostgreSQL container');
  run(npmCommand, ['run', 'db:sync'], 'Applying database schema changes');

  console.log('\n[setup] Completed successfully.');
  console.log('[setup] Next step: start the apps with Nx when you are ready.');
}

main();

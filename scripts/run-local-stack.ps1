$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$NxCmd = Join-Path $RepoRoot "node_modules\.bin\nx.cmd"

$Apps = @(
  "auth-service",
  "product-service",
  "admin-moderation-service",
  "order-service",
  "chat-service",
  "api-gateway",
  "web"
)

Write-Host "Khoi dong PostgreSQL..." -ForegroundColor Cyan
docker compose up -d postgres

Write-Host "Dong bo schema Prisma vao cac database..." -ForegroundColor Cyan
npm.cmd run db:sync

foreach ($App in $Apps) {
  Write-Host "Dang mo terminal cho: $App" -ForegroundColor Cyan
  $Command = "`$env:NODE_OPTIONS=''; `$env:NX_DAEMON='false'; `$env:NX_ISOLATE_PLUGINS='false'; & '$NxCmd' serve $App"
  Start-Process powershell `
    -WorkingDirectory $RepoRoot `
    -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $Command
}

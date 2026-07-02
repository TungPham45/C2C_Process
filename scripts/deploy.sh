#!/bin/bash
set -euo pipefail

DEPLOY_DIR="/home/tung/c2c-platform-run"
LOG_FILE="$DEPLOY_DIR/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

cd "$DEPLOY_DIR"

log "=== DEPLOY START ==="
log "Commit đang triển khai: $(git rev-parse HEAD)"

# Chỉ Rebuild các container backend và web (Giữ nguyên database)
log "Đang tiến hành rebuild các container backend và web..."
docker compose up --build -d --no-deps backend web

# Chờ dịch vụ khởi động ổn định
log "Đang chờ 20 giây để các dịch vụ khởi chạy..."
sleep 20

# Kiểm tra khắt khe: Chỉ cần 1 trong 2 (backend hoặc web) bị lỗi là đánh trượt ngay
if docker compose ps backend web | grep -Eq 'Exit|Restarting'; then
    log "❌ TRIỂN KHAI THẤT BẠI — Phát hiện container bị chết (Crash)"
    docker compose ps backend web
    
    # Báo lỗi lên GitHub Actions để bôi đỏ luồng chạy
    exit 1
else
    log "✅ TRIỂN KHAI THÀNH CÔNG (DEPLOY SUCCESS)"
    docker compose ps backend web
fi

log "=== DEPLOY END ==="
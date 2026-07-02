#!/bin/bash
set -euo pipefail

DEPLOY_DIR="/home/tung/c2c-platform-run"
LOG_FILE="$DEPLOY_DIR/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

cd "$DEPLOY_DIR"

# Lưu lại commit hiện tại đề phòng cần rollback
PREV_COMMIT=$(git rev-parse HEAD)
log "=== DEPLOY START ==="
log "Previous commit: $PREV_COMMIT"

# Kéo code mới nhất từ GitHub về máy ảo
git pull origin main
NEW_COMMIT=$(git rev-parse HEAD)
log "New commit: $NEW_COMMIT"

if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
    log "Không có thay đổi mới. Bỏ qua bước rebuild."
    exit 0
fi

# Chỉ Rebuild các container backend và web (Giữ nguyên database postgres)
log "Đang tiến hành rebuild các container backend và web..."
docker-compose up --build -d --no-deps backend web

# Chờ dịch vụ khởi động ổn định
log "Đang chờ 20 giây để các dịch vụ khởi chạy..."
sleep 20

if docker-compose ps | grep -q "Up"; then
    log "✅ TRIỂN KHAI THÀNH CÔNG (DEPLOY SUCCESS)"
    docker-compose ps
else
    log "❌ TRIỂN KHAI THẤT BẠI — Đang tự động rollback về commit $PREV_COMMIT"
    git checkout "$PREV_COMMIT"
    docker-compose up --build -d --no-deps backend web
    exit 1
fi

log "=== DEPLOY END ==="
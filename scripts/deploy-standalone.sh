#!/usr/bin/env bash
set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_ROOT="/root/data/Image-this"
SHARED_DIR="$APP_ROOT/shared"
RELEASES_DIR="$APP_ROOT/releases"
BACKUPS_DIR="$APP_ROOT/backups"
CURRENT_LINK="$APP_ROOT/current"
APP_NAME="imagine-this-web"
PORT="34123"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"
KEEP_RELEASES=5

RELEASE_ID="${1:?release id is required}"
ARCHIVE_PATH="${2:?archive path is required}"
NEW_RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
PREVIOUS_RELEASE=""
ROLLED_BACK=0

log() {
  echo -e "$1$2${NC}"
}

load_node_env() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    source "$NVM_DIR/nvm.sh"
    nvm use 20 >/dev/null 2>&1 || true
  fi
}

ensure_runtime() {
  load_node_env

  if ! command -v node >/dev/null 2>&1; then
    log "$RED" "❌ 未找到 Node.js，请先在服务器安装 Node 20。"
    exit 1
  fi

  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$node_major" != "20" ]; then
    log "$RED" "❌ 当前 Node 版本为 $(node -v)，该项目要求 Node 20。请先完成服务器 Node 20 升级后再部署。"
    exit 1
  else
    log "$GREEN" "✅ Node 版本: $(node -v)"
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    log "$YELLOW" "⚠️ 未找到 PM2，尝试自动安装..."
    npm install -g pm2
  fi

  log "$GREEN" "✅ PM2 版本: $(pm2 -v | tail -n 1)"
}

prepare_shared_dirs() {
  mkdir -p "$SHARED_DIR/data" "$SHARED_DIR/public/uploads" "$RELEASES_DIR" "$BACKUPS_DIR"
  touch "$SHARED_DIR/data/app.db"

  if [ ! -f "$SHARED_DIR/.env" ]; then
    if [ -f "$APP_ROOT/.env" ]; then
      cp "$APP_ROOT/.env" "$SHARED_DIR/.env"
    elif [ -f "$APP_ROOT/.env.production" ]; then
      cp "$APP_ROOT/.env.production" "$SHARED_DIR/.env"
    else
      log "$RED" "❌ 缺少环境变量文件。请先在 $SHARED_DIR/.env 或 $APP_ROOT/.env 中配置 NEXTAUTH_SECRET / NEXTAUTH_URL。"
      exit 1
    fi
  fi
}

backup_shared_state() {
  log "$YELLOW" "[1/8] 📦 备份共享数据..."

  if [ -f "$SHARED_DIR/data/app.db" ]; then
    if command -v fuser >/dev/null 2>&1 && fuser "$SHARED_DIR/data/app.db" >/dev/null 2>&1; then
      log "$YELLOW" "⚠️ 检测到 SQLite 正在被占用，跳过本次数据库文件备份以避免阻塞部署"
    else
      cp "$SHARED_DIR/data/app.db" "$BACKUPS_DIR/app.db.$TIMESTAMP"
      log "$GREEN" "✅ 数据库备份完成"
    fi
  else
    log "$YELLOW" "⚠️ 数据库文件不存在，跳过备份"
  fi

  if [ -d "$SHARED_DIR/public/uploads" ] && [ "$(ls -A "$SHARED_DIR/public/uploads" 2>/dev/null)" ]; then
    tar -czf "$BACKUPS_DIR/uploads.$TIMESTAMP.tar.gz" -C "$SHARED_DIR/public" uploads
    log "$GREEN" "✅ 上传文件备份完成"
  else
    log "$YELLOW" "⚠️ 上传目录为空，跳过备份"
  fi

  find "$BACKUPS_DIR" -maxdepth 1 -type f -name 'app.db.*' -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr | awk 'NR>10{sub(/^[^ ]+ /, ""); print}' | xargs -r rm -f
  find "$BACKUPS_DIR" -maxdepth 1 -type f -name 'uploads.*.tar.gz' -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr | awk 'NR>10{sub(/^[^ ]+ /, ""); print}' | xargs -r rm -f
  echo
}

stop_existing_service() {
  log "$YELLOW" "[2/9] ⏹️ 停止旧服务释放端口..."
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
    pm2 save >/dev/null || true
    log "$GREEN" "✅ 已停止旧 PM2 服务"
  else
    log "$YELLOW" "⚠️ 未发现运行中的 PM2 服务"
  fi
  echo
}

extract_release() {
  log "$YELLOW" "[3/9] 📂 解压新版本..."
  rm -rf "$NEW_RELEASE_DIR"
  mkdir -p "$NEW_RELEASE_DIR"
  tar -xzf "$ARCHIVE_PATH" -C "$NEW_RELEASE_DIR"
  mkdir -p "$NEW_RELEASE_DIR/public" "$NEW_RELEASE_DIR/logs"
  log "$GREEN" "✅ 新版本已解压到 $NEW_RELEASE_DIR"
  echo
}

link_shared_resources() {
  log "$YELLOW" "[4/9] 🔗 关联共享数据目录..."
  rm -rf "$NEW_RELEASE_DIR/data"
  ln -sfn "$SHARED_DIR/data" "$NEW_RELEASE_DIR/data"

  rm -rf "$NEW_RELEASE_DIR/public/uploads"
  ln -sfn "$SHARED_DIR/public/uploads" "$NEW_RELEASE_DIR/public/uploads"

  ln -sfn "$SHARED_DIR/.env" "$NEW_RELEASE_DIR/.env"
  log "$GREEN" "✅ 共享目录和环境变量已关联"
  echo
}

run_prisma_push() {
  log "$YELLOW" "[5/9] 🗄️ 执行 Prisma db push..."
  (
    cd "$NEW_RELEASE_DIR"
    export DATABASE_URL="file:./data/app.db"
    if [ -f "node_modules/prisma/build/index.js" ]; then
      node node_modules/prisma/build/index.js db push --schema prisma/schema.prisma --accept-data-loss
    elif [ -x "node_modules/.bin/prisma" ]; then
      node node_modules/.bin/prisma db push --schema prisma/schema.prisma --accept-data-loss
    else
      npx prisma db push --schema prisma/schema.prisma --accept-data-loss
    fi
  )
  log "$GREEN" "✅ Prisma 数据库同步完成"
  echo
}

switch_release() {
  log "$YELLOW" "[6/9] 🔁 切换 current 软链接..."
  if [ -L "$CURRENT_LINK" ]; then
    PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
  fi
  ln -sfn "$NEW_RELEASE_DIR" "$CURRENT_LINK"
  log "$GREEN" "✅ current -> $NEW_RELEASE_DIR"
  echo
}

restart_service() {
  log "$YELLOW" "[7/9] 🚀 重启 PM2 服务..."
  (
    cd "$CURRENT_LINK"

    if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
      log "$BLUE" "ℹ️ 检测到已存在的 PM2 进程，先删除以刷新 cwd / script / env"
      pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
    fi

    pm2 start ecosystem.production.config.js --only "$APP_NAME" --update-env
    pm2 save >/dev/null
    pm2 describe "$APP_NAME"
  )
  log "$GREEN" "✅ PM2 服务已重启"
  echo
}

health_check() {
  log "$YELLOW" "[8/9] 🏥 执行健康检查..."
  for attempt in $(seq 1 30); do
    echo -e "${BLUE}✓ 尝试 ${attempt}/30...${NC}"

    if ! pm2 describe "$APP_NAME" >/dev/null 2>&1; then
      log "$YELLOW" "⚠️ PM2 进程不存在，等待重新拉起..."
      sleep 2
      continue
    fi

    pm2_status="$(pm2 jlist 2>/dev/null | node -e '
      const fs = require("fs");
      const raw = fs.readFileSync(0, "utf8").trim();
      if (!raw) process.exit(0);
      const apps = JSON.parse(raw);
      const app = apps.find((item) => item.name === process.argv[1]);
      if (app?.pm2_env?.status) process.stdout.write(String(app.pm2_env.status));
    ' "$APP_NAME" 2>/dev/null || true)"

    if [ "$pm2_status" = "online" ] && curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      log "$GREEN" "✅ 健康检查通过"
      echo
      return 0
    fi

    if [ -n "$pm2_status" ]; then
      log "$BLUE" "ℹ️ 当前 PM2 状态: $pm2_status"
    fi
    sleep 2
  done
  return 1
}

rollback() {
  if [ "$ROLLED_BACK" -eq 1 ]; then
    return
  fi
  ROLLED_BACK=1

  log "$RED" "❌ 部署失败，开始回滚..."

  if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    (
      cd "$CURRENT_LINK"
      if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
        pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
      fi
      pm2 start ecosystem.production.config.js --only "$APP_NAME" --update-env || true
      pm2 save >/dev/null || true
      pm2 describe "$APP_NAME" || true
    )
    log "$GREEN" "✅ 已回滚到上一个版本: $PREVIOUS_RELEASE"
  else
    log "$YELLOW" "⚠️ 未找到可回滚的上一版本"
  fi
}

cleanup_old_releases() {
  log "$YELLOW" "[9/9] 🧹 清理旧版本与临时包..."
  rm -f "$ARCHIVE_PATH"

  mapfile -t release_paths < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)
  release_count="${#release_paths[@]}"
  if [ "$release_count" -gt "$KEEP_RELEASES" ]; then
    remove_count=$((release_count - KEEP_RELEASES))
    for old_release in "${release_paths[@]:0:remove_count}"; do
      if [ -n "$PREVIOUS_RELEASE" ] && [ "$old_release" = "$PREVIOUS_RELEASE" ]; then
        continue
      fi
      if [ "$old_release" = "$NEW_RELEASE_DIR" ]; then
        continue
      fi
      rm -rf "$old_release"
    done
  fi

  log "$GREEN" "✅ 清理完成"
  echo
}

show_summary() {
  log "$GREEN" "========================================"
  log "$GREEN" "   🎉 Standalone 部署成功！"
  log "$GREEN" "========================================"
  log "$BLUE" "服务目录: $CURRENT_LINK"
  log "$BLUE" "服务地址: http://image.bojie.store"
  log "$BLUE" "健康检查: $HEALTH_URL"
  log "$BLUE" "PM2 服务名: $APP_NAME"
  echo
}

trap 'rollback' ERR

log "$BLUE" "========================================"
log "$BLUE" "   Imagine This - Standalone Deployment"
log "$BLUE" "========================================"
echo

prepare_shared_dirs
ensure_runtime
backup_shared_state
stop_existing_service
extract_release
link_shared_resources
run_prisma_push
switch_release
restart_service
if ! health_check; then
  rollback
  exit 1
fi
cleanup_old_releases
show_summary

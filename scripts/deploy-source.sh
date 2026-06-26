#!/usr/bin/env bash
# 服务器侧部署：解压源码 → npm ci → prisma db push → npm run build → pm2 reload。
# 由 GitHub Actions 通过 SSH 触发。
#
# 用法（环境变量必填）：
#   APP_ROOT  应用根目录，如 /root/data/Image-this-staging
#   APP_NAME  PM2 进程名，如 imagine-this-web-staging
#   PORT      监听端口，如 34124
#
# 位置参数：
#   $1  RELEASE_ID（commit sha）
#   $2  TARBALL    （绝对路径，源码 tar.gz）
set -Eeuo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${1}${2}${NC}"; }

: "${APP_ROOT:?APP_ROOT is required}"
: "${APP_NAME:?APP_NAME is required}"
: "${PORT:?PORT is required}"

RELEASE_ID="${1:?release id is required}"
ARCHIVE_PATH="${2:?archive path is required}"

RELEASES_DIR="$APP_ROOT/releases"
SHARED_DIR="$APP_ROOT/shared"
CURRENT_LINK="$APP_ROOT/current"
NEW_RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"
KEEP_RELEASES=3

PREVIOUS_RELEASE=""
[ -L "$CURRENT_LINK" ] && PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" || true)"

mkdir -p "$RELEASES_DIR" "$SHARED_DIR/data" "$SHARED_DIR/public/uploads" "$APP_ROOT/backups"

load_node_env() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    source "$NVM_DIR/nvm.sh"
    nvm use 20 >/dev/null 2>&1 || true
  fi
}
load_node_env

log "$YELLOW" "[1/8] 📂 解压源码到 $NEW_RELEASE_DIR"
rm -rf "$NEW_RELEASE_DIR"
mkdir -p "$NEW_RELEASE_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$NEW_RELEASE_DIR"
log "$GREEN" "✅ 解压完成"

log "$YELLOW" "[2/8] 🔗 关联共享目录与环境变量"
mkdir -p "$NEW_RELEASE_DIR/public"
rm -rf "$NEW_RELEASE_DIR/data" "$NEW_RELEASE_DIR/public/uploads"
ln -s "$SHARED_DIR/data" "$NEW_RELEASE_DIR/data"
ln -s "$SHARED_DIR/public/uploads" "$NEW_RELEASE_DIR/public/uploads"
if [ -f "$SHARED_DIR/.env.production" ]; then
  cp "$SHARED_DIR/.env.production" "$NEW_RELEASE_DIR/.env.production"
  log "$BLUE" "ℹ️ 已套用 $SHARED_DIR/.env.production"
else
  cat > "$NEW_RELEASE_DIR/.env.production" <<EOF
DATABASE_URL=file:../data/app.db
NEXTAUTH_URL=http://localhost:${PORT}
NEXTAUTH_SECRET=placeholder-please-set-${SHARED_DIR//\//_}-env-production
EOF
  log "$YELLOW" "⚠️ 未找到 $SHARED_DIR/.env.production，已写入 placeholder。生产环境务必手动维护该文件。"
fi
log "$GREEN" "✅ 关联完成"

cd "$NEW_RELEASE_DIR"

log "$YELLOW" "[3/8] 📦 npm ci"
npm ci --prefer-offline --no-audit --no-fund
log "$GREEN" "✅ 依赖安装完成"

log "$YELLOW" "[4/8] 🗄️ Prisma generate + db push"
./node_modules/.bin/prisma generate
DATABASE_URL="file:../data/app.db" ./node_modules/.bin/prisma db push --skip-generate
log "$GREEN" "✅ Prisma 同步完成"

log "$YELLOW" "[5/8] 🛠️ npm run build"
NODE_ENV=production npm run build
log "$GREEN" "✅ 构建完成"

log "$YELLOW" "[6/8] 🔁 切换 current 软链接"
ln -snf "$NEW_RELEASE_DIR" "$CURRENT_LINK"
log "$GREEN" "✅ current -> $NEW_RELEASE_DIR"

log "$YELLOW" "[7/8] 🚀 重启 PM2 服务（$APP_NAME）"
cd "$CURRENT_LINK"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
fi
PM_APP_NAME="$APP_NAME" PORT="$PORT" pm2 start config/ecosystem.production.config.js --update-env
pm2 save >/dev/null
log "$GREEN" "✅ PM2 已启动"

log "$YELLOW" "[8/8] 🏥 健康检查"
ok=0
for attempt in $(seq 1 30); do
  sleep 3
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    ok=1
    break
  fi
  echo "  尝试 ${attempt}/30..."
done

if [ "$ok" -eq 1 ]; then
  log "$GREEN" "✅ 健康检查通过：$HEALTH_URL"
  # 清理旧 release，保留最近 N 个
  cd "$RELEASES_DIR"
  # shellcheck disable=SC2012
  ls -1dt -- */ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
  log "$GREEN" "🎉 部署成功 ($RELEASE_ID)"
  exit 0
fi

log "$RED" "❌ 健康检查超时，开始回滚"
if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
  ln -snf "$PREVIOUS_RELEASE" "$CURRENT_LINK"
  cd "$CURRENT_LINK"
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  fi
  PM_APP_NAME="$APP_NAME" PORT="$PORT" pm2 start config/ecosystem.production.config.js --update-env || true
  pm2 save >/dev/null || true
  log "$YELLOW" "已回滚到 $PREVIOUS_RELEASE"
else
  log "$RED" "无可回滚的历史版本"
fi
exit 1

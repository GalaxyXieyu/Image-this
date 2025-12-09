#!/bin/bash

# 清理构建缓存脚本
# 用于解决打包时的缓存问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧹 开始清理构建缓存...${NC}\n"

# 1. 清理 Next.js 构建缓存
if [ -d ".next" ]; then
  echo -e "${YELLOW}📁 删除 .next 目录...${NC}"
  rm -rf .next
  echo -e "${GREEN}✅ .next 已删除${NC}\n"
else
  echo -e "${GREEN}✅ .next 目录不存在，跳过${NC}\n"
fi

# 2. 清理 Electron 构建产物
if [ -d "dist-electron" ]; then
  echo -e "${YELLOW}📁 删除 dist-electron 目录...${NC}"
  rm -rf dist-electron
  echo -e "${GREEN}✅ dist-electron 已删除${NC}\n"
else
  echo -e "${GREEN}✅ dist-electron 目录不存在，跳过${NC}\n"
fi

# 3. 清理 node_modules/.cache
if [ -d "node_modules/.cache" ]; then
  echo -e "${YELLOW}📁 删除 node_modules/.cache 目录...${NC}"
  rm -rf node_modules/.cache
  echo -e "${GREEN}✅ node_modules/.cache 已删除${NC}\n"
else
  echo -e "${GREEN}✅ node_modules/.cache 目录不存在，跳过${NC}\n"
fi

# 4. 清理 Prisma 生成的文件
if [ -d "node_modules/.prisma" ]; then
  echo -e "${YELLOW}📁 删除 node_modules/.prisma 目录...${NC}"
  rm -rf node_modules/.prisma
  echo -e "${GREEN}✅ node_modules/.prisma 已删除${NC}\n"
fi

if [ -d "node_modules/@prisma/client" ]; then
  echo -e "${YELLOW}📁 删除 node_modules/@prisma/client 目录...${NC}"
  rm -rf node_modules/@prisma/client
  echo -e "${GREEN}✅ @prisma/client 已删除${NC}\n"
fi

# 5. 重新生成 Prisma Client（包含 Windows 引擎）
echo -e "${BLUE}🔨 重新生成 Prisma Client...${NC}"
export PRISMA_CLI_BINARY_TARGETS="windows,darwin,darwin-arm64,linux-musl-openssl-3.0.x"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client 生成完成${NC}\n"

echo -e "${GREEN}✨ 清理完成！现在可以重新构建了${NC}"
echo -e "${YELLOW}💡 提示：运行 'npm run build:windows' 开始构建${NC}\n"

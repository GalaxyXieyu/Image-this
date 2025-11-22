#!/bin/bash

# 应用打包脚本
# 用于打包 macOS 和 Windows 应用

set -e

echo "🚀 开始打包应用..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ node_modules 不存在，请先运行 npm install${NC}"
    exit 1
fi

# 1. 生成图标
echo -e "${BLUE}📦 步骤 1/4: 生成应用图标...${NC}"
if [ -f "scripts/generate-icon.js" ]; then
    node scripts/generate-icon.js
    echo -e "${GREEN}✓ 图标生成完成${NC}"
else
    echo -e "${YELLOW}⚠ 图标生成脚本不存在，跳过${NC}"
fi
echo ""

# 2. 构建 Next.js 应用
echo -e "${BLUE}📦 步骤 2/4: 构建 Next.js 应用...${NC}"
npm run build
echo -e "${GREEN}✓ Next.js 构建完成${NC}"
echo ""

# 3. 打包 macOS 应用
echo -e "${BLUE}📦 步骤 3/4: 打包 macOS 应用...${NC}"
echo -e "${YELLOW}⏳ 这可能需要 10-20 分钟，请耐心等待...${NC}"
npm run electron:build:mac
echo -e "${GREEN}✓ macOS 应用打包完成${NC}"
echo ""

# 4. 打包 Windows 应用
echo -e "${BLUE}📦 步骤 4/4: 打包 Windows 应用...${NC}"
echo -e "${YELLOW}⏳ 这可能需要 10-20 分钟，请耐心等待...${NC}"

# 检查是否在 macOS 上且未安装 wine
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v wine &> /dev/null; then
        echo -e "${YELLOW}⚠ 未检测到 wine，Windows 打包可能失败${NC}"
        echo -e "${YELLOW}  建议安装: brew install wine mono${NC}"
        echo -e "${YELLOW}  或在 Windows 系统上执行打包${NC}"
        echo ""
        read -p "是否继续尝试打包 Windows 应用? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}⏭ 跳过 Windows 打包${NC}"
            echo ""
            echo -e "${GREEN}✨ 打包完成！${NC}"
            echo ""
            echo "📦 输出文件:"
            echo "  macOS: dist-electron/*.dmg"
            echo "  macOS: dist-electron/*.zip"
            exit 0
        fi
    fi
fi

npm run electron:build:win
echo -e "${GREEN}✓ Windows 应用打包完成${NC}"
echo ""

# 完成
echo -e "${GREEN}✨ 所有应用打包完成！${NC}"
echo ""
echo "📦 输出文件:"
echo "  macOS DMG:  dist-electron/*.dmg"
echo "  macOS ZIP:  dist-electron/*.zip"
echo "  Windows:    dist-electron/*Setup*.exe"
echo "  Windows:    dist-electron/*portable*.exe"
echo ""
echo "🎉 打包成功！现在可以分发应用了。"

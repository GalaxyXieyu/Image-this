#!/bin/bash

# Windows 应用构建脚本
# 用途：自动化构建 Windows 桌面应用

set -e

echo "🚀 开始构建 Windows 应用..."
echo ""

# 1. 检查环境
echo "📋 步骤 1/6: 检查构建环境"
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"
echo ""

# 2. 检查生产环境配置
echo "📋 步骤 2/6: 检查环境配置"
if [ ! -f ".env.production" ]; then
    echo "⚠️  未找到 .env.production 文件"
    echo "📝 正在从 .env.production.example 创建..."
    cp .env.production.example .env.production
    echo "⚠️  请编辑 .env.production 文件，填写实际配置"
    echo ""
    read -p "是否继续构建？(y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ 找到 .env.production 配置文件"
fi
echo ""

# 3. 安装依赖
echo "📋 步骤 3/6: 安装依赖"
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
else
    echo "✅ 依赖已安装"
fi
echo ""

# 4. 生成数据库
echo "📋 步骤 4/6: 准备数据库"
echo "🔨 生成 Prisma Client..."
npx prisma generate
echo "✅ 数据库准备完成"
echo ""

# 5. 构建 Next.js 应用
echo "📋 步骤 5/6: 构建 Next.js 应用"
echo "🔨 开始构建..."
npm run build
echo "✅ Next.js 应用构建完成"
echo ""

# 6. 打包 Electron 应用
echo "📋 步骤 6/6: 打包 Windows 应用"
echo "🔨 开始打包..."
npm run electron:build:win
echo ""

echo "✨ 构建完成！"
echo ""
echo "📦 输出目录: dist-electron/"
echo "📁 安装包位置:"
ls -lh dist-electron/*.exe 2>/dev/null || echo "   未找到 .exe 文件"
echo ""
echo "💡 提示："
echo "   - NSIS 安装包：适合需要安装的用户"
echo "   - Portable 版本：适合免安装直接运行"
echo ""

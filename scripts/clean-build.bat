@echo off
REM 清理构建缓存脚本（Windows 版本）
REM 用于解决打包时的缓存问题

echo.
echo [94m🧹 开始清理构建缓存...[0m
echo.

REM 1. 清理 Next.js 构建缓存
if exist ".next" (
  echo [93m📁 删除 .next 目录...[0m
  rmdir /s /q ".next"
  echo [92m✅ .next 已删除[0m
  echo.
) else (
  echo [92m✅ .next 目录不存在，跳过[0m
  echo.
)

REM 2. 清理 Electron 构建产物
if exist "dist-electron" (
  echo [93m📁 删除 dist-electron 目录...[0m
  rmdir /s /q "dist-electron"
  echo [92m✅ dist-electron 已删除[0m
  echo.
) else (
  echo [92m✅ dist-electron 目录不存在，跳过[0m
  echo.
)

REM 3. 清理 node_modules/.cache
if exist "node_modules\.cache" (
  echo [93m📁 删除 node_modules\.cache 目录...[0m
  rmdir /s /q "node_modules\.cache"
  echo [92m✅ node_modules\.cache 已删除[0m
  echo.
) else (
  echo [92m✅ node_modules\.cache 目录不存在，跳过[0m
  echo.
)

REM 4. 清理 Prisma 生成的文件
if exist "node_modules\.prisma" (
  echo [93m📁 删除 node_modules\.prisma 目录...[0m
  rmdir /s /q "node_modules\.prisma"
  echo [92m✅ node_modules\.prisma 已删除[0m
  echo.
)

if exist "node_modules\@prisma\client" (
  echo [93m📁 删除 node_modules\@prisma\client 目录...[0m
  rmdir /s /q "node_modules\@prisma\client"
  echo [92m✅ @prisma\client 已删除[0m
  echo.
)

REM 5. 重新生成 Prisma Client（包含 Windows 引擎）
echo [94m🔨 重新生成 Prisma Client...[0m
set PRISMA_CLI_BINARY_TARGETS=windows,darwin,darwin-arm64,linux-musl-openssl-3.0.x
call npx prisma generate
echo [92m✅ Prisma Client 生成完成[0m
echo.

echo [92m✨ 清理完成！现在可以重新构建了[0m
echo [93m💡 提示：运行 'npm run build:windows' 开始构建[0m
echo.

pause

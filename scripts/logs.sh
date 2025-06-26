#!/bin/bash

# 日志查看脚本
PROJECT_DIR="/home/devbox/project"
LOGS_DIR="$PROJECT_DIR/logs"

case "$1" in
  "tail"|"t")
    echo "📊 实时监控所有日志..."
    tail -f "$LOGS_DIR/combined-0.log"
    ;;
  "error"|"e")
    echo "🚨 实时监控错误日志..."
    tail -f "$LOGS_DIR/error-0.log"
    ;;
  "out"|"o")
    echo "📝 实时监控输出日志..."
    tail -f "$LOGS_DIR/out-0.log"
    ;;
  "last"|"l")
    lines=${2:-50}
    echo "📋 显示最近 $lines 行日志..."
    tail -n "$lines" "$LOGS_DIR/combined-0.log"
    ;;
  "search"|"s")
    if [ -z "$2" ]; then
      echo "❌ 请提供搜索关键词"
      echo "用法: $0 search <关键词>"
      exit 1
    fi
    echo "🔍 搜索包含 '$2' 的日志..."
    grep -i "$2" "$LOGS_DIR/combined-0.log" | tail -20
    ;;
  "api"|"a")
    echo "🌐 显示最近的 API 调用日志..."
    grep -E "(GET|POST|PUT|DELETE|API)" "$LOGS_DIR/combined-0.log" | tail -20
    ;;
  "clear"|"c")
    echo "🧹 清空日志文件..."
    > "$LOGS_DIR/combined-0.log"
    > "$LOGS_DIR/out-0.log"
    > "$LOGS_DIR/error-0.log"
    echo "✅ 日志已清空"
    ;;
  "size"|"sz")
    echo "📏 日志文件大小:"
    ls -lh "$LOGS_DIR"/*.log
    ;;
  *)
    echo "🚀 日志查看工具"
    echo ""
    echo "用法: $0 <命令> [参数]"
    echo ""
    echo "命令:"
    echo "  tail, t          实时监控所有日志"
    echo "  error, e         实时监控错误日志"
    echo "  out, o           实时监控输出日志"
    echo "  last, l [行数]   显示最近的日志 (默认50行)"
    echo "  search, s <关键词> 搜索日志内容"
    echo "  api, a           显示 API 调用日志"
    echo "  clear, c         清空所有日志"
    echo "  size, sz         显示日志文件大小"
    echo ""
    echo "示例:"
    echo "  $0 tail          # 实时查看日志"
    echo "  $0 last 100     # 查看最近100行"
    echo "  $0 search error # 搜索错误"
    echo "  $0 api          # 查看API调用"
    ;;
esac

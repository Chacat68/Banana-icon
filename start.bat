@echo off
chcp 65001 >nul 2>&1
title Banana Icon - 本地开发服务器

echo.
echo  🍌 Banana Icon 本地启动
echo  ========================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ 未检测到 Node.js，请先安装: https://nodejs.org
    pause
    exit /b 1
)

:: 切换到项目根目录
cd /d "%~dp0"

:: 检查 node_modules
if not exist "node_modules" (
    echo  📦 首次运行，安装依赖...
    call npm install
    echo.
)

:: 检查 .env
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  ✓ 已从 .env.example 复制 .env，请编辑填入实际配置
    )
)

:: 确保 uploads 目录
if not exist "public\uploads" (
    mkdir "public\uploads"
    echo  ✓ 已创建 public\uploads 目录
)

echo  🚀 启动开发服务器 http://localhost:3000
echo  按 Ctrl+C 停止
echo.

set NODE_OPTIONS=
npx next dev --port 3000

pause

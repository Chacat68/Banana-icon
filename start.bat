@echo off
chcp 65001 >nul 2>&1
title Banana Icon - 本地开发服务器

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
if errorlevel 1 (
    echo.
    echo  启动失败，请检查上面的错误信息。
    pause
)

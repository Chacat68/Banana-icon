@echo off
setlocal enabledelayedexpansion
title Banana Icon - Local Dev Server

cd /d "%~dp0"

echo.
echo Banana Icon local startup
echo =========================
echo.

if not exist ".env" (
    if exist ".env.example" (
        echo [WARN] .env was not found. It will be copied by the PowerShell startup script.
    ) else (
        echo [WARN] .env was not found and .env.example is missing.
    )
) else (
    findstr /b /c:"NANO_BANANA_API_KEY=your_api_key_here" ".env" >nul 2>&1
    if not errorlevel 1 (
        echo [WARN] NANO_BANANA_API_KEY is still using the placeholder value.
        echo        Update .env or fill it later on the /settings page.
    )

    findstr /b /c:"NANO_BANANA_API_URL=https://api.nano-banana.example.com" ".env" >nul 2>&1
    if not errorlevel 1 (
        echo [WARN] NANO_BANANA_API_URL is still using the placeholder value.
        echo        Update .env or fill it later on the /settings page.
    )
)

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
if errorlevel 1 (
    echo.
    echo Startup failed. Check the error messages above.
    pause
)

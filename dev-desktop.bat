@echo off
setlocal enabledelayedexpansion
title KameHouse Desktop (Dev)
cd /d "%~dp0"

echo ===================================================
echo   Iniciando KameHouse Desktop en modo desarrollo...
echo ===================================================
echo.

:: 1. Limpieza preventiva de procesos y puertos huerfanos anteriores
echo [1/3] Verificando y liberando puertos/procesos anteriores...
taskkill /F /IM kamehouse.exe /T >nul 2>&1
taskkill /F /IM kamehouse-desktop.exe /T >nul 2>&1

:: 2. Pre-compilacion rapida del servidor Go (sidecar)
echo [2/3] Preparando servidor Go...
call pnpm build:server:dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Fallo al compilar el servidor Go.
    pause
    exit /b %ERRORLEVEL%
)

:: 3. Variables de entorno optimizadas para Rust y Node
set CARGO_INCREMENTAL=1
set RUST_BACKTRACE=1
set KAMEHOUSE_DEV_API_PORT=43212

echo [3/3] Iniciando entorno interactivo (Web + Desktop)...
echo.

call pnpm dev:desktop

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] El proceso termino con errores (Codigo: %ERRORLEVEL%).
    pause
)

:: Limpieza preventiva al salir
taskkill /F /IM kamehouse.exe /T >nul 2>&1

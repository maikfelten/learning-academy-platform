@echo off
setlocal
cd /d "%~dp0"
title Learning Academy Platform

echo ==========================================================
echo   Learning Academy Platform
echo ==========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found.
  echo Please install Node.js 22 or newer: https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies once. This takes a moment ...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo ERROR during "npm install". Please check the output above.
    pause
    exit /b 1
  )
  echo.
)

echo Building the interface ...
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR while building the interface.
  pause
  exit /b 1
)

echo.
echo Server starting on http://localhost:5180
echo Keep this window open - press Ctrl+C to stop.
echo.

start "" http://localhost:5180
if exist ".env" (
  node --env-file=.env server/index.js
) else (
  node server/index.js
)

echo.
echo Server stopped.
pause

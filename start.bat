@echo off
echo NexTerm Setup
echo ==============

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Please install from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found: 
node -v

echo.
echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo npm install failed
    pause
    exit /b 1
)

echo.
echo Starting NexTerm...
call npm start

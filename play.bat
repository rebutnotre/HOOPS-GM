@echo off
cd /d "%~dp0"
netstat -an | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    start "" http://localhost:5173
) else (
    start "" http://localhost:5173
    npm run dev
)

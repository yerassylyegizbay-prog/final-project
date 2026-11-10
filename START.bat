@echo off
title SABAQ AI
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

if exist node_modules goto env
echo.
echo  First start: installing SABAQ AI (1-2 minutes, needs internet)...
echo.
call npm install
if errorlevel 1 goto failed

:env
if not exist .env.local copy .env.example .env.local >nul

echo.
echo  ==================================================
echo    SABAQ AI is starting...
echo    The browser will open by itself in a few seconds.
echo    DO NOT close this window while you use the app.
echo  ==================================================
echo.
start "" /min cmd /c "timeout /t 10 /nobreak >nul & start http://localhost:3000"
call npm run dev
pause
exit /b

:nonode
echo.
echo  Node.js is not installed.
echo  The website nodejs.org will open now:
echo  download the LTS version, install it, then double-click START.bat again.
echo.
start https://nodejs.org
pause
exit /b

:failed
echo.
echo  Installation failed. Check your internet connection and try again.
echo.
pause

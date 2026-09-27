@echo off
title BetGuard - Frontend Web (Port 3000)
setlocal

if exist "%USERPROFILE%\scoop\shims" (
    set "PATH=%USERPROFILE%\scoop\shims;%USERPROFILE%\scoop\apps\nodejs-lts\current;%PATH%"
)

cd /d "%~dp0frontend"
echo ========================================================
echo        DANG KHOI CHAY BETGUARD FRONTEND (PORT 3000)
echo        Web App: http://localhost:3000
echo ========================================================
call npm run start
if errorlevel 1 (
    echo [Thong bao] Dang khoi chay che do phat trien (dev)...
    call npm run dev
)

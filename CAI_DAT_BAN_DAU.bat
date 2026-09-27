@echo off
title BetGuard - Cai Dat Moi Truong Ban Dau
setlocal

echo ========================================================
echo        CAI DAT MOI TRUONG BETGUARD TU DONG
echo ========================================================

echo [1/3] Dang cai dat thu vien Backend Python...
cd /d "%~dp0backend"
pip install -r requirements.txt

echo.
echo [2/3] Dang cai dat thu vien Frontend Next.js...
cd /d "%~dp0frontend"
call npm install

echo.
echo [3/3] Dang bien dich ban giao dien toi uu...
call npm run build

echo.
echo ========================================================
echo        CAI DAT HOAN TAT 100%!
echo   Bay gio ban chi can bam file 'start-all.bat' de chay!
echo ========================================================
pause

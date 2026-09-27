@echo off
title BetGuard - All-in-One Launcher
setlocal

echo ========================================================
echo              BETGUARD - KHOI DONG HE THONG
echo ========================================================
echo 1. Dang khoi chay Backend API tren cong 8000 ...
start "BetGuard Backend" "%~dp0start-backend.bat"

timeout /t 3 /nobreak >nul

echo 2. Dang khoi chay Frontend Web tren cong 3000 ...
start "BetGuard Frontend" "%~dp0start-frontend.bat"

timeout /t 3 /nobreak >nul

echo 3. Dang tu dong mo trinh duyet Web ...
start http://localhost:3000

echo ========================================================
echo              BETGUARD DA DUOC KHOI CHAY!
echo   Giao dien Web : http://localhost:3000
echo   API May chu   : http://localhost:8000
echo   Tai lieu API  : http://localhost:8000/docs
echo ========================================================

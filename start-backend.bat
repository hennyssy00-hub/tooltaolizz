@echo off
title BetGuard - Backend Server (Port 8000)
setlocal

if exist "%USERPROFILE%\scoop\shims" (
    set "PATH=%USERPROFILE%\scoop\shims;%USERPROFILE%\scoop\apps\python\current;%USERPROFILE%\scoop\apps\python\current\Scripts;%PATH%"
)

cd /d "%~dp0backend"
echo ========================================================
echo        DANG KHOI CHAY BETGUARD BACKEND (PORT 8000)
echo        API Docs: http://localhost:8000/docs
echo ========================================================
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
if errorlevel 1 (
    echo [LOI] Khong the khoi chay Backend. Vui long kiem tra Python da duoc cai dat chua.
    pause
)

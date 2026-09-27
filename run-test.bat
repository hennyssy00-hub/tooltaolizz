@echo off
title CasinoGuard - Run Pipeline Test
setlocal

set "PATH=%USERPROFILE%\scoop\shims;%USERPROFILE%\scoop\apps\python\current;%USERPROFILE%\scoop\apps\python\current\Scripts;%PATH%"

cd /d "%~dp0backend"
echo ========================================================
echo        RUNNING FULL PIPELINE FRAUD DETECTION TEST
echo ========================================================
python3 -u test_pipeline.py
pause

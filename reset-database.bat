@echo off
chcp 65001 >nul
echo ========================================================
echo   BETGUARD - L?M S?CH TO?N B? C? S? D? LI?U V? 0
echo ========================================================
echo.
echo Thao t?c n?y s? x?a t?t c? c?c v? c??c, c?nh b?o v? phi?n qu?t m?u.
echo.
set /p confirm="B?n c? ch?c ch?n mu?n x?a s?ch v? 0 kh?ng? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo ?? h?y thao t?c.
    pause
    exit /b 0
)

echo.
echo ?ang x?a d? li?u m?u...
cd /d "%~dp0backend"
C:\Users\HONG\scoop\apps\python\current\python.exe reset_db.py

echo.
echo ========================================================
echo   HO?N T?T! To?n b? s? li?u ?? ???c ??a v? 0.
echo   B?y gi? b?n c? th? n?p file th?t c?a m?nh t?i trang /upload
echo ========================================================
pause

@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Dead Mans - stop site and API

call "%~dp0dev-common.bat" PrintBanner "Stop all" "API port 5285" "Site port 5180"
if errorlevel 1 exit /b 1

echo   [i] Releasing ports 5285, 5180 and 5290...
echo   ------------------------------------------------------------
call "%~dp0dev-common.bat" StopListenPort 5285 "API"
call "%~dp0dev-common.bat" StopListenPort 5180 "site"
call "%~dp0dev-common.bat" StopListenPort 5290 "Twitch EventSub proxy"
echo   ------------------------------------------------------------
echo   [OK] Done.
echo.
pause
exit /b 0

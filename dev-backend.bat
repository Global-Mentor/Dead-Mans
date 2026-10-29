@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Dead Mans - API only

call "%~dp0dev-common.bat" PrintBanner "API only" "http://localhost:5285"
if errorlevel 1 exit /b 1

call "%~dp0dev-common.bat" RequireCmd dotnet
if errorlevel 1 goto :Fail

call "%~dp0dev-common.bat" EnsurePortFree 5285 "API"
if errorlevel 1 goto :Fail

if not exist "backend\backend.csproj" (
  echo   [ERROR] backend\backend.csproj was not found.
  goto :Fail
)

echo.
echo   [^>^>] Starting API...
echo   ------------------------------------------------------------
call npm run dev:backend
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo.
  echo   [ERROR] Backend services exited with code %EC%.
  goto :Fail
)
exit /b 0

:Fail
echo.
pause
exit /b 1

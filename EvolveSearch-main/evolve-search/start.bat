@echo off
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   ⚡ EVOLVE-SEARCH Launcher          ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check Node
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

:: Setup .env files
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo WARNING: Created backend\.env from template
  echo Add your API keys to backend\.env for full features
  echo.
)

if not exist "frontend\.env" (
  copy "frontend\.env.example" "frontend\.env" >nul
)

:: Install dependencies
echo Installing backend dependencies...
cd backend
call npm install --silent
cd ..

echo Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..

echo.
echo Starting backend on http://localhost:5000 ...
start "EVOLVE-SEARCH Backend" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak >nul

echo Starting frontend on http://localhost:3000 ...
cd frontend
call npm start

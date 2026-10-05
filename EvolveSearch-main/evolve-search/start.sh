#!/bin/bash
# EVOLVE-SEARCH Startup Script

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ⚡ EVOLVE-SEARCH Launcher          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Setup backend .env
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo -e "${YELLOW}⚠ Created backend/.env from template — add your API keys for full features${NC}"
fi

# Setup frontend .env
if [ ! -f "frontend/.env" ]; then
  cp frontend/.env.example frontend/.env
fi

# Install deps
echo ""
echo -e "${CYAN}Installing backend dependencies...${NC}"
cd backend && npm install --silent
cd ..

echo -e "${CYAN}Installing frontend dependencies...${NC}"
cd frontend && npm install --silent
cd ..

echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""
echo -e "${CYAN}Starting EVOLVE-SEARCH...${NC}"
echo -e "  Backend:  ${YELLOW}http://localhost:5000${NC}"
echo -e "  Frontend: ${YELLOW}http://localhost:3000${NC}"
echo ""

# Start backend in background
cd backend && node server.js &
BACKEND_PID=$!
cd ..

sleep 2

# Start frontend
cd frontend && npm start

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null

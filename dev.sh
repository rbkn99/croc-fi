#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "Stopping all services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# ── Colors ──
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev]${NC} $1"; }

# ── Check dependencies ──
for cmd in docker node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is not installed"
    exit 1
  fi
done

# ── 1. PostgreSQL via Docker ──
log "Starting PostgreSQL..."
cd "$ROOT/backend"
docker compose up -d --wait 2>/dev/null || docker-compose up -d 2>/dev/null
log "PostgreSQL ready on :5432"

# ── 2. Backend setup ──
log "Installing backend dependencies..."
cd "$ROOT/backend"
npm install --silent 2>/dev/null

if [ ! -f .env ]; then
  warn ".env not found, creating from .env.example..."
  cp .env.example .env
  sed -i.bak 's|API_PORT=3000|API_PORT=3001|' .env 2>/dev/null || \
    sed -i '' 's|API_PORT=3000|API_PORT=3001|' .env
  rm -f .env.bak
fi

# Generate Prisma client
log "Running Prisma generate + migrate..."
npx prisma generate --schema=shared/prisma/schema.prisma 2>/dev/null
npx prisma migrate deploy --schema=shared/prisma/schema.prisma 2>/dev/null || \
  npx prisma db push --schema=shared/prisma/schema.prisma 2>/dev/null

# ── 3. Frontend setup ──
log "Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install --silent 2>/dev/null

if [ ! -f .env.local ]; then
  warn ".env.local not found, creating..."
  cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EOF
fi

# ── 4. Start backend API ──
log "Starting backend API on :3001..."
cd "$ROOT/backend"
npm run dev:api > /tmp/croc-api.log 2>&1 &
PIDS+=($!)

# Wait for API to be ready
for i in {1..30}; do
  if curl -sf http://localhost:3001/api/v1/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
log "Backend API ready on :3001"

# ── 5. Start frontend ──
log "Starting frontend on :3000..."
cd "$ROOT/frontend"
npm run dev > /tmp/croc-front.log 2>&1 &
PIDS+=($!)

sleep 3

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}  Frontend:  http://localhost:3000${NC}"
echo -e "${CYAN}  Backend:   http://localhost:3001/api/v1${NC}"
echo -e "${CYAN}  Postgres:  localhost:5432${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""
echo -e "Logs: ${YELLOW}tail -f /tmp/croc-api.log /tmp/croc-front.log${NC}"
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo ""

wait

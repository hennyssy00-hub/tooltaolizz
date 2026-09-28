#!/bin/bash
set -e

echo "[BetGuard] Starting Backend (FastAPI)..."
cd /app/backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &

echo "[BetGuard] Waiting for backend to initialize..."
sleep 3

echo "[BetGuard] Starting Frontend..."
cd /app/frontend
PORT_NUM=${PORT:-10000}
exec ./node_modules/.bin/next start -p "$PORT_NUM" -H 0.0.0.0

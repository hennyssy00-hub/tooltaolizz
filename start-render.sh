#!/bin/bash
set -e
echo '?? Starting BetGuard Backend (FastAPI)...'
cd /app/backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
echo '? Waiting for backend to initialize...'
sleep 3
echo '? Starting BetGuard Frontend (Next.js) on port '\'...'
cd /app/frontend
PORT= exec ./node_modules/.bin/next start -p  -H 0.0.0.0

#!/bin/bash
cd "$(dirname "$0")"
echo "🍽️  Restaurant-Reservierung wird gestartet ..."
echo ""
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
  echo "📦 Dependencies werden installiert ..."
  npm run install:all
fi
if [ ! -f ".env" ]; then
  echo "⚠️  .env nicht gefunden – kopiere .env.example und fülle Werte aus."
  cp .env.example .env
  open .env
  exit 1
fi
echo "🚀 Dev-Server starten (Customer: http://localhost:5173, Admin: http://localhost:5173/admin)"
(sleep 4 && open http://localhost:5173 && open http://localhost:5173/admin) &
npm run dev

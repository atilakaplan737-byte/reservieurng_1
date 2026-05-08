#!/bin/bash
echo "🛑 Stoppe Reservierungs-Server ..."
# tsx watch + vite + concurrently
pkill -f "tsx watch src/index.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "concurrently.*dev:server.*dev:client" 2>/dev/null
echo "✅ Erledigt"

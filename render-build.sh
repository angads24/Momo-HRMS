#!/bin/bash
set -e

echo "=== Building Momo HRMS Backend Services ==="

for s in auth-service employee-service attendance-service geofence-service notification-service api-gateway; do
  echo "--> Building $s..."
  (
    cd "backend/$s"
    npm install --include=dev
    (npx prisma generate 2>/dev/null || true)
    npm run build
    # Ensure dist/main.js exists if compiled to dist/src/main.js
    if [ -f "dist/src/main.js" ] && [ ! -f "dist/main.js" ]; then
      cp dist/src/main.js dist/main.js 2>/dev/null || true
    fi
  )
done

echo "=== All services built successfully! ==="

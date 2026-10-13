#!/bin/bash
set -e

echo "=== Building Momo HRMS Backend Services ==="

for s in auth-service employee-service attendance-service geofence-service notification-service api-gateway; do
  echo "--> Building $s..."
  (cd "backend/$s" && npm install --include=dev && (npx prisma generate 2>/dev/null || true) && npm run build)
done

echo "=== All services built successfully! ==="

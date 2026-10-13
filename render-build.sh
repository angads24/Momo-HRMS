#!/bin/bash
set -e

echo "=== Building Momo HRMS Backend Services ==="

echo "--> Building auth-service..."
(cd backend/auth-service && npm install --include=dev && npx prisma generate && npm run build)

echo "--> Building employee-service..."
(cd backend/employee-service && npm install --include=dev && npx prisma generate && npm run build)

echo "--> Building attendance-service..."
(cd backend/attendance-service && npm install --include=dev && npx prisma generate && npm run build)

echo "--> Building geofence-service..."
(cd backend/geofence-service && npm install --include=dev && npx prisma generate && npm run build)

echo "--> Building notification-service..."
(cd backend/notification-service && npm install --include=dev && npx prisma generate && npm run build)

echo "--> Building api-gateway..."
(cd backend/api-gateway && npm install --include=dev && npm run build)

echo "=== All services built successfully! ==="

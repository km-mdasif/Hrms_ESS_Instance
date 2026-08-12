# Multi-stage Dockerfile for HRMS ESS PWA + Node backend

FROM node:20-alpine AS builder
WORKDIR /app

# Copy metadata and app sources
COPY package.json ./
COPY frontend/package.json frontend/package.json
COPY frontend/package-lock.json frontend/package-lock.json
COPY backend/package.json backend/package.json
COPY backend/package-lock.json backend/package-lock.json
COPY frontend ./frontend
COPY backend ./backend
COPY certs ./certs

# Install dependencies and build the React PWA
RUN cd frontend && npm ci && npm run build
RUN cd backend && npm ci

# Runtime image
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/certs ./certs

ENV NODE_ENV=production
EXPOSE 5000 5443

CMD ["node", "backend/https-server.js"]

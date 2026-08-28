FROM node:22-alpine
WORKDIR /app
EXPOSE 3000

# Cache-bust: force rebuild when Dockerfile changes (update date to trigger new build)
ARG CACHE_DATE=2026-08-28
ENV NEXT_DISABLE_TELEMETRY=1
# Do NOT set PORT here — Railway injects PORT=8080 at runtime

# Install deps without running postinstall (postinstall runs prisma generate
# but the prisma/ directory hasn't been copied yet).
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx prisma generate && npm run build

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/dashboard || exit 1

CMD ["npm", "start"]

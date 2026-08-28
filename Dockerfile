FROM node:22-alpine
WORKDIR /app
EXPOSE 3000

# Cache-bust: force rebuild of npm ci layer
ARG CACHE_DATE=2026-08-28-2
ENV NEXT_DISABLE_TELEMETRY=1
# Do NOT set PORT here — Railway injects PORT=8080 at runtime

# Install deps without running postinstall (postinstall runs prisma generate
# but the prisma/ directory hasn't been copied yet).
COPY package*.json ./
RUN npm ci --ignore-scripts && \
    # Force prisma to regenerate (clear its cache)
    rm -rf node_modules/.prisma node_modules/@prisma 2>/dev/null || true

COPY . .
RUN npx prisma generate && npm run build

CMD ["npm", "start"]

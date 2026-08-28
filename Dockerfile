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
# Build args passed from Railway (set via railway up --build-arg)
ARG DATABASE_URL
ARG GITHUB_TOKEN
ARG NEXTAUTH_SECRET

RUN npx prisma generate && npm run build && npx prisma migrate deploy

CMD ["npm", "start"]

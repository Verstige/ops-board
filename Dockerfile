FROM node:22-alpine
WORKDIR /app
EXPOSE 3000

# Install deps without running postinstall (postinstall runs prisma generate
# but the prisma/ directory hasn't been copied yet).
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx prisma generate && npm run build

CMD ["npm", "start"]

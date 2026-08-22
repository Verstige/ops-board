FROM node:22-alpine
WORKDIR /app
EXPOSE 3000

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

CMD ["npm", "start"]

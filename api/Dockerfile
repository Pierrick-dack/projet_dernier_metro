# api/Dockerfile (version optimisée)
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

USER node
CMD ["node", "server.js"]
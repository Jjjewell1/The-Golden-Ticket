# ---- Build the web frontend ----
FROM node:22-alpine AS web
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

# ---- Install server production dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY server/assets ./assets
COPY --from=web /app/dist ./web-dist
EXPOSE 8080
CMD ["node", "src/index.js"]

# syntax=docker/dockerfile:1

FROM node:24-slim AS dependencies
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-slim AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node
EXPOSE 4300
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '4300') + '/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]


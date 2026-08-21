FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY examples ./examples

# Snapshots are written here; mount a volume to persist them
ENV N8N_SNAPSHOT_DIR=/data/snapshots
VOLUME ["/data"]

ENTRYPOINT ["node", "dist/index.js"]

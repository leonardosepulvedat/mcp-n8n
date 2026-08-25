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
# Placeholders so the image starts and answers MCP introspection
# (initialize / tools/list) without a live n8n instance. Override in production.
ENV N8N_BASE_URL=https://localhost
ENV N8N_API_KEY=not-configured
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY examples ./examples
COPY data ./data

# Snapshots are written here; mount a volume to persist them
ENV N8N_SNAPSHOT_DIR=/data/snapshots
VOLUME ["/data"]

ENTRYPOINT ["node", "dist/index.js"]

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm test

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DUO_DATA_DIR=/data
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir /data && chown node:node /data
EXPOSE 3000
CMD ["node", "dist/launch.mjs"]

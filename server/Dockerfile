FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY graphql ./graphql

ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "--no-warnings", "server/index.mjs"]

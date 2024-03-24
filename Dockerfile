# Builder Stage
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm i pnpm -g && pnpm i --production
RUN pnpm build

# Runtime Stage
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

CMD ["pnpm", "start"]

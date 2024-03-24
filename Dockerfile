# TODO - I want somehow dockerize it so other can contribute withount needed creating accounts to setup env

# Builder Stage
FROM node:20 AS builder
WORKDIR /app
COPY . .
COPY .env.local . # Copy your environment file into the image
RUN npm install pnpm -g && pnpm install --production
RUN pnpm build

# Runtime Stage
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY .env.local .

CMD ["pnpm", "start"]

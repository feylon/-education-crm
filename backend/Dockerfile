FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY apps ./apps
COPY libs ./libs
RUN npm run build && npm prune --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache wget && addgroup -S app && adduser -S app -G app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
RUN mkdir -p /data/uploads && chown -R app:app /data /app
USER app
ARG SERVICE=gateway
ENV SERVICE=${SERVICE}
EXPOSE 3000 3001
CMD ["sh", "-c", "node dist/apps/${SERVICE}/src/main.js"]

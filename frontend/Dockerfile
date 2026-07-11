# syntax=docker/dockerfile:1
# node:20-alpine 고정 — 서버(사내 71번)에서 node:22 이미지 풀 실패 → 풀 가능한 LTS로 다운
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 로컬 로그인 전용 — OIDC/Keycloak 빌드 args 없음
RUN npm run build

# standalone 산출물만 담은 런타임 이미지 (next.config.ts output: "standalone")
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# node 이미지에 내장된 비루트 사용자
USER node

EXPOSE 7000
CMD ["node", "server.js"]

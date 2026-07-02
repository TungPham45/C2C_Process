# Đổi nền tảng sang Debian Slim an toàn tuyệt đối cho Prisma
FROM node:22-slim
WORKDIR /app

# Bổ sung thư viện OpenSSL chuẩn cho Prisma Engine
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY nx.json tsconfig.base.json ecosystem.config.js ./
COPY apps ./apps
COPY libs ./libs

ARG APP_NAME=api-gateway
ENV APP_NAME=$APP_NAME

RUN npm ci --ignore-scripts --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

RUN npx prisma generate --schema=libs/prisma-clients/admin-mod-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/auth-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/chat-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/order-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/product-client/schema.prisma

# Build all applications for production (excluding web)
RUN npx nx run-many --target=build --projects=api-gateway,auth-service,product-service,order-service,chat-service,admin-moderation-service --parallel=6

# Install PM2 globally to manage Node.js processes efficiently
RUN npm install -g pm2

EXPOSE 3000

# Start all backend services via PM2 (handles restarts, logging, and memory limits)
CMD ["pm2-runtime", "ecosystem.config.js"]
FROM node:22-slim
WORKDIR /app

# Bổ sung thư viện OpenSSL chuẩn cho Prisma Engine
RUN apt-get update -y && apt-get install -y openssl

# 1. CHỈ COPY ĐÚNG QUẢN LÝ THƯ VIỆN LÊN TRƯỚC (Bảo vệ Cache tuyệt đối)
COPY package*.json ./

# 2. CÀI THƯ VIỆN NGAY LẬP TỨC (Sẽ mất 0s nếu package.json không đổi)
# Kèm theo lệnh xóa cache npm sau khi cài xong để giảm nhẹ dung lượng Image
RUN npm ci --ignore-scripts --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
    && npm cache clean --force

# 3. MỚI BẮT ĐẦU COPY CÁC FILE CẤU HÌNH VÀ CODE (Sửa mấy file này thoải mái không lo mất cache npm)
COPY nx.json tsconfig.base.json ecosystem.config.js ./
COPY apps ./apps
COPY libs ./libs

ARG APP_NAME=api-gateway
ENV APP_NAME=$APP_NAME

# Generate Prisma Engine
RUN npx prisma generate --schema=libs/prisma-clients/admin-mod-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/auth-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/chat-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/order-client/schema.prisma
RUN npx prisma generate --schema=libs/prisma-clients/product-client/schema.prisma

# 4. BUILD XONG PHẢI XÓA SẠCH RÁC NGAY TRÊN CÙNG MỘT DÒNG LỆNH
RUN npx nx run-many --target=build --projects=api-gateway,auth-service,product-service,order-service,chat-service,admin-moderation-service --parallel=6 \
    && rm -rf .nx/cache .nx/workspace-data

# Install PM2
RUN npm install -g pm2

EXPOSE 3000

# Start all backend services
CMD ["pm2-runtime", "ecosystem.config.js"]
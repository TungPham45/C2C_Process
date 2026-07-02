FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json ./

# 1. Chỉ đường thẳng cho React biết Backend đang nằm ở cùng host với relative path
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm ci --ignore-scripts --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY apps ./apps
COPY libs ./libs
RUN npx nx build web --prod

FROM nginx:alpine
# 2. Cấu hình Nginx chuẩn mực cho React và Proxy API đến Backend
RUN rm /etc/nginx/conf.d/default.conf && \
    echo 'server {' >> /etc/nginx/conf.d/default.conf && \
    echo '  listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '  location /api/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_pass http://backend:3000/api/;' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && \
    echo '  }' >> /etc/nginx/conf.d/default.conf && \
    echo '  location /uploads/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_pass http://backend:3000/uploads/;' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    echo '  }' >> /etc/nginx/conf.d/default.conf && \
    echo '  location /socket.io/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_pass http://backend:3000/socket.io/;' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_set_header Upgrade $http_upgrade;' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_set_header Connection "upgrade";' >> /etc/nginx/conf.d/default.conf && \
    echo '    proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    echo '  }' >> /etc/nginx/conf.d/default.conf && \
    echo '  location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '  }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/apps/web /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
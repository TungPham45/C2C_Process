module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'dist/apps/api-gateway/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'auth-service',
      script: 'dist/apps/auth-service/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'product-service',
      script: 'dist/apps/product-service/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'order-service',
      script: 'dist/apps/order-service/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      }
    },
    {
      name: 'chat-service',
      script: 'dist/apps/chat-service/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      }
    },
    {
      name: 'admin-moderation-service',
      script: 'dist/apps/admin-moderation-service/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    }
  ]
};

# C2C Platform Development Guide

This guide describes the project structure, architectural patterns, and development workflows for the C2C Platform. Following these patterns ensures consistency and scalability as the platform grows.

---

## 🏗️ Architecture Overview

The C2C Platform follows a **Microservices Architecture** managed within an **Nx Monorepo**.

- **Frontend (`apps/web`)**: A single React application that serves as the primary user interface. It communicates exclusively with the `api-gateway`.
- **API Gateway (`apps/api-gateway`)**: The entry point for all frontend requests. It handles authentication (JWT), extracts user context, and proxies requests to the appropriate microservices.
- **Microservices (`apps/*-service`)**: Independent NestJS applications, each responsible for a specific domain (e.g., Auth, Product, Order).
- **Libraries (`libs/`)**: Shared code, primarily **Prisma Clients**, used by multiple services.

---

## 📂 Project Structure

```text
c2c-platform/
├── apps/
│   ├── web/                    # React (Vite) Frontend
│   ├── api-gateway/            # NestJS Gateway & Proxy
│   ├── auth-service/           # NestJS Auth & User Service
│   ├── product-service/        # NestJS Product & Shop Service
│   ├── order-service/          # NestJS Order & Fulfillment Service
│   └── admin-moderation-service/ # NestJS Admin & Moderation Service
├── libs/
│   └── prisma-clients/         # Shared database clients & schemas
├── db/                         # Database seeds and initialization scripts
├── docker/                     # Docker configuration (pgAdmin, etc.)
└── nx.json                     # Nx Monorepo configuration
```

---

## 🛠️ Backend Service Pattern (NestJS)

Each microservice in `apps/` follows a standardized internal structure:

### 1. File Organization
```text
src/
├── app/
│   ├── app.module.ts           # Root module
│   ├── prisma.service.ts       # Database access provider
│   ├── [domain].controller.ts  # HTTP routes
│   └── [domain].service.ts     # Business logic
└── main.ts                     # Entry point (Port configuration)
```

### 2. User Context & Authentication
The **API Gateway** intercepts Bearer tokens, verifies the JWT, and passes user identity to downstream services via HTTP headers:
- `x-user-id`: The authenticated User ID (sub).
- `x-role`: The user's role (e.g., 'buyer', 'seller', 'admin').

**Example: Accessing User ID in a Controller**
```typescript
@Get('me')
getProfile(@Headers('x-user-id') userId: string) {
  return this.service.getUser(Number(userId));
}
```

---

## 🗄️ Database & Prisma

We use a **Database-per-Service** strategy. Currently, all databases reside on a single PostgreSQL instance but are separate schemas/databases.

### 1. Schema Locations
Schemas are organized in `libs/prisma-clients`:
- `libs/prisma-clients/auth-client/schema.prisma`
- `libs/prisma-clients/product-client/schema.prisma`
- ... etc.

### 2. Generating Clients
Clients are generated into specific paths within `node_modules/@prisma/client/` to avoid conflicts.
When you change a schema, run:
```bash
npm run prisma:generate
```

### 3. Usage in Services
To import the correct client, use the specific generated path:
```typescript
import { PrismaClient } from '@prisma/client/product/index.js';
```

---

## 🌐 API Gateway & Proxying

The gateway uses `http-proxy-middleware` for routing. Routes are defined in `apps/api-gateway/src/main.ts`.

- `/api/auth` -> `auth-service` (Port 3002)
- `/api/products` -> `product-service` (Port 3001)
- `/api/orders` -> `order-service` (Port 3004)
- `/api/admin` -> `admin-moderation-service` (Port 3005)

> [!NOTE]
> All frontend requests should go to `http://localhost:3000/api/...`.

---

## 💻 Frontend Patterns (React)

The frontend uses **Tailwind CSS** for styling and **React Router DOM** for navigation.

### 1. Component Structure
- **Components (`src/components/`)**: Atomic elements, layouts, and reusable UI parts.
- **Pages (`src/pages/`)**: Full pages mapped to routes.
- **Hooks (`src/hooks/`)**: Shared logic and data fetching wrappers.

### 2. Styling
We prioritize a "Premium & Serene" design. Use vibrant gradients, glassmorphism, and smooth transitions. Avoid standard browser defaults.

---

## 🚀 Development Workflow

### Starting the Stack
The easiest way to run everything locally (with hot reload) is:
```bash
npm run local:up
```
This opens 5 terminal windows for you.

### Creating a New Service
1. Generate the service using Nx: `npx nx generate @nx/nest:app apps/my-service`
2. Create a new Prisma schema in `libs/prisma-clients/my-client/schema.prisma`.
3. Add the generation command to `libs/prisma-clients/project.json`.
4. Register the new proxy route in `apps/api-gateway/src/main.ts`.

### Database Migrations
To push schema changes during development:
```bash
npx prisma db push --schema=libs/prisma-clients/my-client/schema.prisma
```

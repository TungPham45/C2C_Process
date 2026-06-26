import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/auth/index.js';

@Injectable()
export class AuthPrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.AUTH_DATABASE_URL ??
            'postgresql://postgres:123456@postgres:5432/auth_db',
        },
      },
    });
  }

  async onModuleInit() {
    // Establish connection to database
    await this.$connect();
  }
}

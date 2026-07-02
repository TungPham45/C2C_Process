import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/auth/index.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ??
            'postgresql://postgres:123456@postgres:5432/auth_db',
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}

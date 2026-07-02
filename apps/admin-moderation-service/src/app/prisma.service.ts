import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/admin-mod/index.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ??
            'postgresql://postgres:123456@postgres:5432/admin_mod_db',
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}

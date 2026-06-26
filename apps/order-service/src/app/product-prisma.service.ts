import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/product/index.js';

@Injectable()
export class ProductPrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.PRODUCT_DATABASE_URL ??
            'postgresql://postgres:123456@postgres:5432/product_db',
        },
      },
    });
  }

  async onModuleInit() {
    // Establish connection to database
    await this.$connect();
  }
}

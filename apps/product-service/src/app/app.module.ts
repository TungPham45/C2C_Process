import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaService } from './prisma.service';

const uploadsDir = join(process.cwd(), 'public', 'uploads', 'products');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => {
          // Generate unique filename: timestamp-random.ext
          const ext = file.originalname.split('.').pop() || 'jpg';
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  ],
  controllers: [ProductController],
  providers: [ProductService, PrismaService],
})
export class AppModule {}

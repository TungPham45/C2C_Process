import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  // Ensure the uploads directory exists
  const uploadsDir = join(process.cwd(), 'public', 'uploads', 'products');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files as static assets
  // File at public/uploads/products/abc.jpg → accessible at http://localhost:3001/uploads/products/abc.jpg
  app.useStaticAssets(join(process.cwd(), 'public'));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`🚀 Product Service running on: http://localhost:${port}/${globalPrefix}`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  app.enableCors();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3005;
  await app.listen(port);
  Logger.log(`🚀 Admin Service running on: http://localhost:${port}/${globalPrefix}`);
}
bootstrap();

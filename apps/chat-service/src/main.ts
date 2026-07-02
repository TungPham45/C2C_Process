/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  
  // We use the global prefix "api" because the gateway strips "/api/chat" down to "/api" or keeps it?
  // Wait, if gateway does NOT strip path, the request comes as /api/chat
  // If we set global prefix to 'api/chat', the controller routes will just be '/conversations'
  const globalPrefix = 'api/chat';
  app.setGlobalPrefix(globalPrefix);
  
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT || 3006;
  await app.listen(port);
  Logger.log(
    `🚀 Chat Service is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();

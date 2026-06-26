import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: 'serene-c2c-super-secret-key-2026', // In production, use env vars
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, NotificationsController, WalletController],
  providers: [AuthService, PrismaService, EmailService, NotificationsService, WalletService, NotificationsGateway],
})
export class AppModule {}

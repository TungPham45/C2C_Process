import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaService } from './prisma.service';
import { ProductPrismaService } from './product-prisma.service';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { AuthPrismaService } from './auth-prisma.service';
import { NotificationClientService } from './notification-client.service';
import { WalletClientService } from './wallet-client.service';

@Module({
  imports: [],
  controllers: [OrderController, CartController, VoucherController],
  providers: [OrderService, CartService, PrismaService, ProductPrismaService, VoucherService, AuthPrismaService, NotificationClientService, WalletClientService],
})
export class AppModule { }

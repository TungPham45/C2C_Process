import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ProductPrismaService } from './product-prisma.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productPrisma: ProductPrismaService
  ) {}

  async getCart(userId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { cart_id: userId },
      orderBy: { created_at: 'desc' }
    });

    // Enrich with product details
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const variant = await this.productPrisma.productVariant.findUnique({
        where: { id: item.product_variant_id },
        include: {
          product: {
            include: {
              shop: true
            }
          }
        }
      });
      return {
        ...item,
        variant,
        product: variant?.product,
      };
    }));

    return enrichedItems;
  }

  async addToCart(userId: number, dto: { shop_id: number; product_variant_id: number; quantity: number }) {
    // Check if the item already exists in the cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cart_id: userId,
        shop_id: dto.shop_id,
        product_variant_id: dto.product_variant_id,
      },
    });

    if (existingItem) {
      // Update quantity
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: (existingItem.quantity || 0) + dto.quantity },
      });
    }

    // Create new item
    return this.prisma.cartItem.create({
      data: {
        cart_id: userId,
        shop_id: dto.shop_id,
        product_variant_id: dto.product_variant_id,
        quantity: dto.quantity,
      },
    });
  }

  async updateCartItem(userId: number, itemId: number, quantity: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cart_id !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      return this.prisma.cartItem.delete({
        where: { id: itemId },
      });
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async removeFromCart(userId: number, itemId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cart_id !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }
}

import { Controller, Get, Post, Body, Param, Put, Delete, Req, UnauthorizedException, ParseIntPipe, InternalServerErrorException } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.cartService.getCart(parseInt(userId, 10));
  }

  @Post()
  async addToCart(
    @Req() req: any, 
    @Body() body: { shop_id: number; product_variant_id: number; quantity: number }
  ) {
    try {
      const userId = req.headers['x-user-id'];
      if (!userId) throw new UnauthorizedException('User not authenticated');
      return await this.cartService.addToCart(parseInt(userId, 10), body);
    } catch (err: any) {
      throw new InternalServerErrorException(`Cart error: ${err.message}`);
    }
  }

  @Put(':id')
  async updateCartItem(
    @Req() req: any, 
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { quantity: number }
  ) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.cartService.updateCartItem(parseInt(userId, 10), id, body.quantity);
  }

  @Delete(':id')
  async removeFromCart(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.cartService.removeFromCart(parseInt(userId, 10), id);
  }
}

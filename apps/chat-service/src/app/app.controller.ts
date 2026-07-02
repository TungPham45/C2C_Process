import { Controller, Get, Post, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('conversations')
export class AppController {
  constructor(private readonly appService: AppService) {}

  private getUserId(req: any): number {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return parseInt(userId, 10);
  }

  @Get()
  async getConversations(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.appService.getConversations(userId);
  }

  @Post()
  async createOrGetConversation(@Req() req: any, @Body() body: { shop_id: number, seller_id: number }) {
    const buyerId = this.getUserId(req);
    return this.appService.createOrGetConversation(buyerId, body.shop_id, body.seller_id);
  }

  @Get(':id/messages')
  async getMessages(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.appService.getMessages(+id, userId);
  }

  @Post(':id/messages')
  async sendMessage(@Req() req: any, @Param('id') id: string, @Body() body: { content: string, message_type?: string }) {
    const userId = this.getUserId(req);
    return this.appService.sendMessage(+id, userId, body.content, body.message_type);
  }
}

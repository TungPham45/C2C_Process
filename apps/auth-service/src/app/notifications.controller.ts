import { Controller, Post, Get, Put, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private jwtService: JwtService
  ) {}

  private getUserIdFromReq(req: any): number {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // internal API called by other microservices
  @Post('internal')
  async createInternal(@Body() body: any) {
    return this.notificationsService.createNotification(body);
  }

  @Get()
  async getMyNotifications(@Req() req: any) {
    const userId = this.getUserIdFromReq(req);
    const notifications = await this.notificationsService.getUserNotifications(userId);
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount, notifications };
  }

  @Put('read-all')
  async markAllRead(@Req() req: any) {
    const userId = this.getUserIdFromReq(req);
    return this.notificationsService.markAllAsRead(userId);
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserIdFromReq(req);
    return this.notificationsService.markAsRead(Number(id), userId);
  }
}

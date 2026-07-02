import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway
  ) {}

  async createNotification(data: { user_id: number; title: string; message: string; type?: string; link?: string }) {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
      },
    });

    // Phát sự kiện real-time ngay lập tức
    this.gateway.sendToUser(data.user_id, 'new_notification', notification);

    return notification;
  }

  async getUserNotifications(user_id: number) {
    return this.prisma.notification.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(user_id: number) {
    return this.prisma.notification.count({
      where: { user_id, is_read: false },
    });
  }

  async markAsRead(id: number, user_id: number) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.user_id !== user_id) {
      throw new Error('Notification not found or unauthorized');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }

  async markAllAsRead(user_id: number) {
    return this.prisma.notification.updateMany({
      where: { user_id, is_read: false },
      data: { is_read: true },
    });
  }
}

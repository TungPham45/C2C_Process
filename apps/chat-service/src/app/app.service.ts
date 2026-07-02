import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3002/api/auth';
  private readonly productServiceUrl = process.env.PRODUCT_SERVICE_URL ?? 'http://127.0.0.1:3001/api/products';
  private readonly internalToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';

  constructor(private readonly prisma: PrismaService) {}

  private async sendNotification(data: { user_id: number; title: string; message: string; type: string; link?: string }) {
    try {
      const authUrl = this.authServiceUrl;
      const notificationUrl = authUrl.replace(/\/api\/auth\/?$/, '/api/notifications/internal');
      await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      this.logger.warn('[CHAT NOTIFICATION ERROR]', e);
    }
  }

  private async fetchUserNames(userIds: number[]): Promise<Record<number, string>> {
    const map: Record<number, string> = {};
    if (!userIds.length) return map;
    try {
      const ids = [...new Set(userIds)].join(',');
      const res = await fetch(`${this.authServiceUrl}/internal/admin/users-by-ids?ids=${ids}`, {
        headers: { 'x-internal-token': this.internalToken }
      });
      if (res.ok) {
        const users: any[] = await res.json();
        users.forEach(u => { 
          map[u.id] = u.full_name || (u.email ? u.email.split('@')[0] : `User ${u.id}`); 
        });
      }
    } catch (e) {
      this.logger.warn('Failed to fetch user names', e);
    }
    return map;
  }

  private async fetchShopNames(shopIds: number[]): Promise<Record<number, string>> {
    const map: Record<number, string> = {};
    if (!shopIds.length) return map;
    try {
      const ids = [...new Set(shopIds)].join(',');
      const res = await fetch(`${this.productServiceUrl}/internal/admin/shops-by-ids?ids=${ids}`, {
        headers: { 'x-internal-token': this.internalToken }
      });
      if (res.ok) {
        const shops: any[] = await res.json();
        shops.forEach(s => { map[s.id] = s.name || `Shop ${s.id}`; });
      }
    } catch (e) {
      this.logger.warn('Failed to fetch shop names', e);
    }
    return map;
  }

  async getConversations(userId: number) {
    // Find all conversations where user is buyer OR user is seller.
    const convs = await this.prisma.conversations.findMany({
      where: {
        OR: [
          { buyer_id: userId },
          { seller_id: userId }
        ]
      },
      orderBy: { updated_at: 'desc' }
    });

    // Collect all unique buyer IDs, seller IDs, and shop IDs
    const buyerIds = [...new Set(convs.map(c => c.buyer_id))];
    const sellerIds = [...new Set(convs.map(c => c.seller_id))];
    const allUserIds = [...new Set([...buyerIds, ...sellerIds])];
    const shopIds = [...new Set(convs.map(c => c.shop_id))];

    // Fetch names in parallel
    const [userNames, shopNames] = await Promise.all([
      this.fetchUserNames(allUserIds),
      this.fetchShopNames(shopIds),
    ]);

    // Enrich conversations with names
    return convs.map(conv => ({
      ...conv,
      buyer_name: userNames[conv.buyer_id] || `User ${conv.buyer_id}`,
      seller_name: userNames[conv.seller_id] || `User ${conv.seller_id}`,
      shop_name: shopNames[conv.shop_id] || `Shop ${conv.shop_id}`,
    }));
  }

  async createOrGetConversation(buyerId: number, shopId: number, sellerId: number) {
    // Check if exists
    let conv = await this.prisma.conversations.findFirst({
      where: { buyer_id: buyerId, shop_id: shopId }
    });

    if (!conv) {
      conv = await this.prisma.conversations.create({
        data: {
          buyer_id: buyerId,
          seller_id: sellerId,
          shop_id: shopId,
          status: 'active',
          unread_count_buyer: 0,
          unread_count_seller: 0
        }
      });
    }

    return conv;
  }

  async getMessages(conversationId: number, userId: number) {
    // First Validate user is part of the conversation
    const conv = await this.prisma.conversations.findUnique({
      where: { id: conversationId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.buyer_id !== userId && conv.seller_id !== userId) {
      throw new BadRequestException('Not authorized to view this chat');
    }

    // Reset unread counts
    if (conv.buyer_id === userId) {
      await this.prisma.conversations.update({
        where: { id: conversationId },
        data: { unread_count_buyer: 0 }
      });
    } else {
      await this.prisma.conversations.update({
        where: { id: conversationId },
        data: { unread_count_seller: 0 }
      });
    }

    // Mark messages from the other person as read
    await this.prisma.messages.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        is_read: false
      },
      data: { is_read: true }
    });

    return this.prisma.messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { sent_at: 'asc' }
    });
  }

  async sendMessage(conversationId: number, senderId: number, content: string, messageType: string = 'text') {
    const conv = await this.prisma.conversations.findUnique({
      where: { id: conversationId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
      throw new BadRequestException('Not authorized');
    }

    const senderRole = conv.buyer_id === senderId ? 'buyer' : 'seller';
    
    // Increment unread count for the other party
    let previewText = content.substring(0, 50);
    if (messageType === 'image') previewText = '[Hình ảnh]';
    if (messageType === 'video') previewText = '[Video]';

    const updateData: any = {
      last_message_preview: previewText,
      updated_at: new Date()
    };
    if (senderRole === 'buyer') {
      updateData.unread_count_seller = { increment: 1 };
    } else {
      updateData.unread_count_buyer = { increment: 1 };
    }

    await this.prisma.conversations.update({
      where: { id: conversationId },
      data: updateData
    });

    const receiverId = senderRole === 'buyer' ? conv.seller_id : conv.buyer_id;
    // Tự động bắn thông báo chéo cho bên nhận
    await this.sendNotification({
      user_id: receiverId,
      title: 'Có tin nhắn mới',
      message: messageType === 'text' ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : previewText,
      type: 'CHAT',
      link: senderRole === 'buyer' ? `/seller/chat` : `/messages`
    });

    return this.prisma.messages.create({
      data: {
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
        message_type: messageType
      }
    });
  }
}

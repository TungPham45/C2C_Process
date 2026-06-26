import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly authBaseUrl: string;

  constructor() {
    const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3002/api/auth';
    this.authBaseUrl = authServiceUrl.replace(/\/api\/auth\/?$/, '');
  }

  async sendNotification(data: {
    user_id: number;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }): Promise<void> {
    try {
      const url = `${this.authBaseUrl}/api/notifications/internal`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        this.logger.warn(
          `Failed to send notification to user #${data.user_id}: HTTP ${response.status}`,
        );
      } else {
        this.logger.log(`Notification sent to user #${data.user_id}: "${data.title}"`);
      }
    } catch (error: any) {
      this.logger.error(
        `Error sending notification to user #${data.user_id}: ${error.message}`,
      );
    }
  }
}

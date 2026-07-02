import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WalletClientService {
  private readonly logger = new Logger(WalletClientService.name);
  private readonly authBaseUrl: string;
  private readonly internalToken: string;
  private platformUserId: number | null = null;

  constructor() {
    const authServiceUrl =
      process.env.AUTH_SERVICE_URL ?? 'http://localhost:3002/api/auth';
    this.authBaseUrl = authServiceUrl.replace(/\/api\/auth\/?$/, '');
    this.internalToken =
      process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
  }

  private async request(
    method: string,
    path: string,
    body?: any,
  ): Promise<any> {
    const url = `${this.authBaseUrl}/api/auth/wallet${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': this.internalToken,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(
          `Wallet API ${method} ${path} returned ${res.status}: ${text}`,
        );
        return null;
      }
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Wallet API ${method} ${path} failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the platform/admin user ID (cached after first call).
   */
  async getPlatformUserId(): Promise<number> {
    if (this.platformUserId) return this.platformUserId;
    const result = await this.request('GET', '/internal/platform-user-id');
    if (result) {
      this.platformUserId = result;
    }
    return this.platformUserId ?? 1; // fallback to 1
  }

  /**
   * Transfer money between two user wallets.
   * Returns null on failure (non-blocking).
   */
  async transfer(
    fromUserId: number,
    toUserId: number,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    transactionType?: { from: string; to: string },
  ) {
    return this.request('POST', '/internal/transfer', {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount,
      description,
      reference_id: referenceId,
      reference_type: referenceType,
      transaction_type: transactionType,
    });
  }

  /**
   * Credit a wallet without a sender (COD payment to platform).
   */
  async credit(
    userId: number,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    transactionType?: string,
  ) {
    return this.request('POST', '/internal/credit', {
      user_id: userId,
      amount,
      description,
      reference_id: referenceId,
      reference_type: referenceType,
      transaction_type: transactionType,
    });
  }
}

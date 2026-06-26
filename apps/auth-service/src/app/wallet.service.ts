import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Decimal } from '@prisma/client/auth/runtime/library';
import { TransactionStatus, TransactionType } from '@prisma/client/auth/index.js';

// Threshold above which withdrawals need admin approval (5,000,000 VND)
const WITHDRAWAL_APPROVAL_THRESHOLD = 5_000_000;

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // ───────── USER-FACING ─────────

  async getOrCreateWallet(userId: number) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          user_id: userId,
          balance: 0,
        },
      });
    }

    return {
      id: wallet.id,
      user_id: wallet.user_id,
      balance: wallet.balance ? Number(wallet.balance) : 0,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };
  }

  async topUp(
    userId: number,
    amount: number,
    paymentMethod?: string,
    description?: string,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền nạp phải lớn hơn 0');
    }

    const wallet = await this.ensureWallet(userId);
    const balanceBefore = Number(wallet.balance ?? 0);
    const balanceAfter = this.round(balanceBefore + amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          updated_at: new Date(),
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          transaction_type: 'topup',
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          status: 'completed',
          payment_method: paymentMethod || 'simulated',
          description: description || 'Nạp tiền vào ví',
          completed_at: new Date(),
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return {
      wallet: this.formatWallet(result.wallet),
      transaction: this.formatTransaction(result.transaction),
    };
  }

  async withdraw(
    userId: number,
    amount: number,
    description?: string,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền rút phải lớn hơn 0');
    }

    const wallet = await this.ensureWallet(userId);
    const balanceBefore = Number(wallet.balance ?? 0);

    if (amount > balanceBefore) {
      throw new BadRequestException('Số dư ví không đủ để thực hiện giao dịch');
    }

    const needsApproval = amount >= WITHDRAWAL_APPROVAL_THRESHOLD;
    const status = needsApproval ? 'pending' : 'completed';
    const balanceAfter = this.round(balanceBefore - amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          updated_at: new Date(),
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          transaction_type: 'withdraw',
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          status,
          description: description || 'Rút tiền từ ví',
          completed_at: needsApproval ? null : new Date(),
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return {
      wallet: this.formatWallet(result.wallet),
      transaction: this.formatTransaction(result.transaction),
      needs_approval: needsApproval,
    };
  }

  async getTransactions(
    userId: number,
    filters: {
      type?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };

    if (filters.type && filters.type !== 'all') {
      where.transaction_type = filters.type;
    }
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: data.map((t) => this.formatTransaction(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionById(userId: number, id: number) {
    const transaction = await this.prisma.walletTransaction.findFirst({
      where: { id, user_id: userId },
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    return this.formatTransaction(transaction);
  }

  // ───────── ADMIN-FACING (internal) ─────────

  async getAllWallets(filters: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.wallet.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
              avatar_url: true,
              role: true,
              status: true,
            },
          },
        },
        orderBy: { updated_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wallet.count(),
    ]);

    return {
      data: data.map((w) => ({
        ...this.formatWallet(w),
        user: w.user,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWalletByUserId(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar_url: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Người dùng chưa có ví');
    }

    return {
      ...this.formatWallet(wallet),
      user: wallet.user,
    };
  }

  async getWalletStats() {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });
    let adminBalance = 0;
    if (admin) {
      const adminWallet = await this.prisma.wallet.findUnique({
        where: { user_id: admin.id },
      });
      if (adminWallet && adminWallet.balance) {
        adminBalance = Number(adminWallet.balance);
      }
    }

    const [totalWallets, wallets, transactionStats] = await Promise.all([
      this.prisma.wallet.count(),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
      this.prisma.walletTransaction.groupBy({
        by: ['transaction_type', 'status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const totalBalance = wallets._sum.balance
      ? Number(wallets._sum.balance)
      : 0;

    // Platform volume: sum of all completed transactions
    let platformVolume = 0;
    let pendingPayouts = 0;
    let pendingCount = 0;

    for (const stat of transactionStats) {
      const amount = stat._sum.amount ? Number(stat._sum.amount) : 0;
      if (stat.status === 'completed') {
        platformVolume += amount;
      }
      if (stat.status === 'pending') {
        pendingPayouts += amount;
        pendingCount += stat._count.id;
      }
    }

    return {
      totalWallets,
      totalBalance,
      adminBalance,
      platformVolume,
      pendingPayouts,
      pendingCount,
    };
  }

  async getAllTransactions(
    filters: {
      type?: string;
      status?: string;
      userId?: number;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.type && filters.type !== 'all') {
      where.transaction_type = filters.type;
    }
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    if (filters.userId) {
      where.user_id = filters.userId;
    }

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: data.map((t) => ({
        ...this.formatTransaction(t),
        user: (t as any).user,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionByIdAdmin(id: number) {
    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    return {
      ...this.formatTransaction(transaction),
      user: (transaction as any).user,
    };
  }

  async updateTransactionStatus(id: number, status: string) {
    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (transaction.status !== 'pending') {
      throw new BadRequestException('Chỉ có thể cập nhật giao dịch đang chờ xử lý');
    }

    // If rejecting a pending withdrawal, refund the balance
    if (status === 'failed' && transaction.transaction_type === 'withdraw') {
      const amount = Number(transaction.amount);

      await this.prisma.$transaction(async (tx) => {
        await tx.walletTransaction.update({
          where: { id },
          data: { status: status as TransactionStatus },
        });

        // Refund the balance
        await tx.wallet.update({
          where: { id: transaction.wallet_id },
          data: {
            balance: { increment: amount },
            updated_at: new Date(),
          },
        });
      });

      return { id, status, refunded: true };
    }

    // Approve: just update status
    await this.prisma.walletTransaction.update({
      where: { id },
      data: {
        status: status as TransactionStatus,
        completed_at: status === 'completed' ? new Date() : undefined,
      },
    });

    return { id, status };
  }

  // ───────── INTERNAL / CROSS-SERVICE ─────────

  /**
   * Transfer money between two user wallets atomically.
   * Used by order-service for e-wallet payments and seller payouts.
   */
  async internalTransfer(
    fromUserId: number,
    toUserId: number,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    transactionType?: { from: TransactionType; to: TransactionType },
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền phải lớn hơn 0');
    }

    const fromWallet = await this.ensureWallet(fromUserId);
    const toWallet = await this.ensureWallet(toUserId);

    const fromBalance = Number(fromWallet.balance ?? 0);
    if (amount > fromBalance) {
      throw new BadRequestException('Số dư ví không đủ để thực hiện giao dịch');
    }

    const toBalance = Number(toWallet.balance ?? 0);
    const fromBalanceAfter = this.round(fromBalance - amount);
    const toBalanceAfter = this.round(toBalance + amount);

    const fromType: TransactionType = transactionType?.from ?? TransactionType.transfer_out;
    const toType: TransactionType = transactionType?.to ?? TransactionType.transfer_in;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedFrom = await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: fromBalanceAfter, updated_at: new Date() },
      });

      const updatedTo = await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: toBalanceAfter, updated_at: new Date() },
      });

      const fromTx = await tx.walletTransaction.create({
        data: {
          wallet_id: fromWallet.id,
          user_id: fromUserId,
          transaction_type: fromType,
          amount,
          balance_before: fromBalance,
          balance_after: fromBalanceAfter,
          status: 'completed',
          reference_id: referenceId,
          reference_type: referenceType,
          description: `[Chuyển] ${description}`,
          completed_at: new Date(),
        },
      });

      const toTx = await tx.walletTransaction.create({
        data: {
          wallet_id: toWallet.id,
          user_id: toUserId,
          transaction_type: toType,
          amount,
          balance_before: toBalance,
          balance_after: toBalanceAfter,
          status: 'completed',
          reference_id: referenceId,
          reference_type: referenceType,
          description: `[Nhận] ${description}`,
          completed_at: new Date(),
        },
      });

      return { fromWallet: updatedFrom, toWallet: updatedTo, fromTx, toTx };
    });

    return {
      from: this.formatWallet(result.fromWallet),
      to: this.formatWallet(result.toWallet),
      fromTransaction: this.formatTransaction(result.fromTx),
      toTransaction: this.formatTransaction(result.toTx),
    };
  }

  /**
   * Credit a wallet without a sender (e.g., COD payment arriving at platform).
   */
  async internalCredit(
    userId: number,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    transactionType?: TransactionType,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền phải lớn hơn 0');
    }

    const wallet = await this.ensureWallet(userId);
    const balanceBefore = Number(wallet.balance ?? 0);
    const balanceAfter = this.round(balanceBefore + amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter, updated_at: new Date() },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          transaction_type: transactionType ?? TransactionType.transfer_in,
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          status: 'completed',
          reference_id: referenceId,
          reference_type: referenceType,
          description,
          completed_at: new Date(),
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return {
      wallet: this.formatWallet(result.wallet),
      transaction: this.formatTransaction(result.transaction),
    };
  }

  /**
   * Find the admin/platform user ID (first user with role='admin').
   */
  async getPlatformUserId(): Promise<number> {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (!admin) {
      throw new NotFoundException('Không tìm thấy tài khoản admin/platform');
    }
    return admin.id;
  }

  // ───────── HELPERS ─────────

  private async ensureWallet(userId: number) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          user_id: userId,
          balance: 0,
        },
      });
    }

    return wallet;
  }

  private formatWallet(wallet: any) {
    return {
      id: wallet.id,
      user_id: wallet.user_id,
      balance: wallet.balance ? Number(wallet.balance) : 0,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };
  }

  private formatTransaction(t: any) {
    return {
      id: t.id,
      wallet_id: t.wallet_id,
      user_id: t.user_id,
      transaction_type: t.transaction_type,
      amount: t.amount ? Number(t.amount) : 0,
      balance_before: t.balance_before ? Number(t.balance_before) : 0,
      balance_after: t.balance_after ? Number(t.balance_after) : 0,
      status: t.status,
      reference_id: t.reference_id,
      reference_type: t.reference_type,
      payment_method: t.payment_method,
      description: t.description,
      created_at: t.created_at,
      completed_at: t.completed_at,
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

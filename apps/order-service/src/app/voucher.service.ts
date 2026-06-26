import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthPrismaService } from './auth-prisma.service';
import { ProductPrismaService } from './product-prisma.service';

@Injectable()
export class VoucherService {
  private readonly editableVoucherFields = [
    'code',
    'target_type',
    'discount_type',
    'discount_value',
    'min_spend',
    'max_discount',
    'start_date',
    'end_date',
    'total_quantity',
    'max_per_user',
    'status',
  ] as const;

  constructor(
    private prisma: PrismaService,
    private authPrisma: AuthPrismaService,
    private productPrisma: ProductPrismaService,
  ) {}

  private readonly allowedTargetTypes = ['all_buyers', 'new_buyer', 'followers'] as const;

  private async sendNotification(data: { user_id: number; title: string; message: string; type: string; link?: string }) {
    try {
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3002/api/auth';
      const notificationUrl = authUrl.replace(/\/api\/auth\/?$/, '/api/notifications/internal');
      await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {}
  }

  async getUserVoucherContext(userId: number) {
    const [user, follows, ownedShops] = await Promise.all([
      this.authPrisma.user.findUnique({
        where: { id: userId },
        select: { first_order_at: true },
      }),
      this.productPrisma.shopFollow.findMany({
        where: { user_id: userId },
        select: { shop_id: true },
      }),
      this.productPrisma.shop.findMany({
        where: { owner_id: userId },
        select: { id: true },
      }),
    ]);

    return {
      first_order_at: user?.first_order_at ?? null,
      is_new_buyer: !user?.first_order_at,
      followed_shop_ids: follows.map((follow) => follow.shop_id),
      owned_shop_ids: ownedShops.map((shop) => shop.id),
    };
  }

  isVoucherTargetEligible(
    voucherOrTargetType: { target_type?: string | null; shop_id?: number | null } | string | null | undefined,
    contextOrFirstOrderAt:
      | { first_order_at?: Date | null; followed_shop_ids?: number[]; owned_shop_ids?: number[] }
      | Date
      | null
      | undefined,
    shopId?: number | null,
  ) {
    const targetType =
      typeof voucherOrTargetType === 'string'
        ? voucherOrTargetType
        : voucherOrTargetType?.target_type;
    const resolvedShopId =
      typeof voucherOrTargetType === 'string' ? shopId : voucherOrTargetType?.shop_id ?? shopId;

    if (
      contextOrFirstOrderAt &&
      typeof contextOrFirstOrderAt === 'object' &&
      'owned_shop_ids' in contextOrFirstOrderAt
    ) {
      if (resolvedShopId != null && contextOrFirstOrderAt.owned_shop_ids?.includes(resolvedShopId)) {
        return false;
      }
    }

    if (targetType === 'new_buyer') {
      const firstOrderAt =
        contextOrFirstOrderAt && typeof contextOrFirstOrderAt === 'object' && 'first_order_at' in contextOrFirstOrderAt
          ? contextOrFirstOrderAt.first_order_at
          : (contextOrFirstOrderAt as Date | null | undefined);

      return !firstOrderAt;
    }

    if (targetType === 'followers' || targetType === 'follower') {
      const followedShopIds =
        contextOrFirstOrderAt && typeof contextOrFirstOrderAt === 'object' && 'followed_shop_ids' in contextOrFirstOrderAt
          ? contextOrFirstOrderAt.followed_shop_ids ?? []
          : [];

      return resolvedShopId != null && followedShopIds.includes(resolvedShopId);
    }

    return true;
  }

  isVoucherActiveNow(voucher: any, now = new Date()) {
    if (!voucher || voucher.status !== 'active') {
      return false;
    }

    return now >= new Date(voucher.start_date) && now <= new Date(voucher.end_date);
  }

  meetsMinSpend(voucher: any, amount: number) {
    return amount >= this.toAmount(voucher?.min_spend);
  }

  calculateDiscount(voucher: any, amount: number) {
    const normalizedAmount = this.toAmount(amount);
    if (normalizedAmount <= 0 || !this.meetsMinSpend(voucher, normalizedAmount)) {
      return 0;
    }

    const discountValue = this.toAmount(voucher?.discount_value);
    const rawDiscount =
      voucher?.discount_type === 'percentage'
        ? (normalizedAmount * discountValue) / 100
        : discountValue;

    const maxDiscount = voucher?.max_discount == null ? null : this.toAmount(voucher.max_discount);
    const cappedDiscount = maxDiscount == null ? rawDiscount : Math.min(rawDiscount, maxDiscount);

    return this.toAmount(Math.min(normalizedAmount, cappedDiscount));
  }

  async getAllVouchers() {
    return this.prisma.voucher.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getAdminStats() {
    const now = new Date();
    const [
      totalVouchers,
      activeVouchers,
      scheduledVouchers,
      expiredVouchers,
      platformVouchers,
      shopVouchers,
      totalClaims,
      usedClaims,
    ] = await Promise.all([
      this.prisma.voucher.count(),
      this.prisma.voucher.count({
        where: {
          status: 'active',
          start_date: { lte: now },
          end_date: { gte: now },
        },
      }),
      this.prisma.voucher.count({
        where: {
          OR: [{ status: 'scheduled' }, { start_date: { gt: now } }],
        },
      }),
      this.prisma.voucher.count({
        where: {
          OR: [{ status: 'expired' }, { end_date: { lt: now } }],
        },
      }),
      this.prisma.voucher.count({ where: { shop_id: null } }),
      this.prisma.voucher.count({ where: { shop_id: { not: null } } }),
      this.prisma.userVoucherClaim.count(),
      this.prisma.userVoucherClaim.count({ where: { is_used: true } }),
    ]);

    return {
      totalVouchers,
      activeVouchers,
      scheduledVouchers,
      expiredVouchers,
      platformVouchers,
      shopVouchers,
      totalClaims,
      usedClaims,
    };
  }

  async getVoucherById(id: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }
    return voucher;
  }

  async deleteVoucher(id: number) {
    await this.getVoucherById(id);
    return this.prisma.voucher.delete({
      where: { id },
    });
  }

  async getSellerVouchers(userId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    return this.prisma.voucher.findMany({
      where: { shop_id: shop.id },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSellerVoucherById(userId: number, id: number) {
    const voucher = await this.requireSellerVoucher(userId, id);
    return this.buildVoucherStats(voucher);
  }

  async createSellerVoucher(userId: number, data: any) {
    const shop = await this.requireActiveSellerShop(userId);
    const normalizedData = this.normalizeVoucherData(data, true);

    if (normalizedData.code) {
      const existingVoucher = await this.prisma.voucher.findUnique({
        where: { code: normalizedData.code },
        select: { id: true },
      });
      if (existingVoucher) {
        throw new BadRequestException('Đã có mã voucher này. Vui lòng nhập mã khác.');
      }
    }

    let voucher: any;
    try {
      voucher = await this.prisma.voucher.create({
        data: {
          ...normalizedData,
          shop_id: shop.id,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Đã có mã voucher này. Vui lòng nhập mã khác.');
      }
      throw error;
    }

    // Notify all followers about new voucher
    try {
      const followers = await this.productPrisma.shopFollow.findMany({
        where: { shop_id: shop.id },
        select: { user_id: true },
      });

      const discountText = voucher.discount_type === 'percentage'
        ? `giảm ${voucher.discount_value}%`
        : `giảm ₫${Number(voucher.discount_value).toLocaleString('vi-VN')}`;

      for (const follower of followers) {
        await this.sendNotification({
          user_id: follower.user_id,
          title: `Ưu đãi mới từ ${shop.name}!`,
          message: `Shop "${shop.name}" vừa phát hành mã giảm giá "${voucher.code}" ${discountText}. Đổi ngay trước khi hết!`,
          type: 'SYSTEM',
          link: '/vouchers',
        });
      }
    } catch (e) {}

    return voucher;
  }

  async updateSellerVoucher(userId: number, id: number, data: any) {
    await this.requireSellerVoucher(userId, id);
    const normalizedData = this.normalizeVoucherData(data, false);

    if (normalizedData.code) {
      const existingVoucher = await this.prisma.voucher.findUnique({
        where: { code: normalizedData.code },
        select: { id: true },
      });
      if (existingVoucher && existingVoucher.id !== id) {
        throw new BadRequestException('Đã có mã voucher này. Vui lòng nhập mã khác.');
      }
    }

    try {
      return await this.prisma.voucher.update({
        where: { id },
        data: normalizedData,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Đã có mã voucher này. Vui lòng nhập mã khác.');
      }
      throw error;
    }
  }

  async deleteSellerVoucher(userId: number, id: number) {
    await this.requireSellerVoucher(userId, id);
    return this.prisma.voucher.delete({
      where: { id },
    });
  }

  async getAvailableVouchers(userId: number, onlyActive = false) {
    const userContext = await this.getUserVoucherContext(userId);

    const where: any = {
      status: 'active',
    };

    if (onlyActive) {
      where.start_date = { lte: new Date() };
      where.end_date = { gte: new Date() };
    }

    const vouchers = await this.prisma.voucher.findMany({
      where,
      include: {
        claims: {
          where: { user_id: userId },
          select: { id: true },
        },
        _count: {
          select: { claims: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return vouchers.filter(v => {
      // We still filter by target eligibility (e.g. new buyers only)
      if (!this.isVoucherTargetEligible(v, userContext)) {
        return false;
      }

      if (onlyActive) {
        const totalClaimCount = v._count.claims;
        const totalQuantity = v.total_quantity || 0;
        const userClaimCount = v.claims.length;

        return (
          (totalQuantity === 0 || totalClaimCount < totalQuantity) &&
          userClaimCount < (v.max_per_user || 1)
        );
      }

      return true;
    });
  }

  async getMyVouchers(userId: number) {
    return this.prisma.userVoucherClaim.findMany({
      where: { user_id: userId },
      include: {
        voucher: true,
      },
      orderBy: { claimed_at: 'desc' },
    });
  }

  async claimVoucher(userId: number, voucherId: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        claims: {
          where: { user_id: userId },
          select: { id: true },
        },
        _count: {
          select: { claims: true },
        },
      },
    });

    if (!voucher) throw new NotFoundException('Voucher not found');
    if (!this.isVoucherActiveNow(voucher)) {
      throw new BadRequestException('Voucher is expired or not yet started');
    }

    const userContext = await this.getUserVoucherContext(userId);

    if (!this.isVoucherTargetEligible(voucher, userContext)) {
      if (voucher.shop_id != null && userContext.owned_shop_ids?.includes(voucher.shop_id)) {
        throw new BadRequestException('Bạn không thể lưu hoặc sử dụng voucher do chính shop của mình phát hành.');
      }
      throw new BadRequestException(this.getVoucherTargetErrorMessage(voucher.target_type));
    }

    if (voucher.total_quantity && voucher._count.claims >= voucher.total_quantity) {
      throw new BadRequestException('Voucher has reached its limit');
    }

    if (voucher.claims.length >= (voucher.max_per_user || 1)) {
      throw new BadRequestException('You have already claimed this voucher');
    }

    return this.prisma.userVoucherClaim.create({
      data: {
        user_id: userId,
        voucher_id: voucherId,
      },
    });
  }

  async getVoucherStats(id: number) {
    const voucher = await this.getVoucherById(id);
    return this.buildVoucherStats(voucher);
  }

  private getDaysRemaining(endDate: Date) {
    const diff = endDate.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private async requireActiveSellerShop(userId: number) {
    const shop = await this.productPrisma.shop.findFirst({
      where: {
        owner_id: userId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!shop) {
      throw new UnauthorizedException('No active seller shop found for this user');
    }

    return shop;
  }

  private async requireSellerVoucher(userId: number, voucherId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher || voucher.shop_id !== shop.id) {
      throw new NotFoundException(`Voucher with ID ${voucherId} not found`);
    }

    return voucher;
  }

  private buildVoucherStats(voucher: any) {
    const redeemedCount = voucher.used_count || 0;
    const totalQuantity = voucher.total_quantity || 0;
    const capacity = totalQuantity > 0 ? (redeemedCount / totalQuantity) * 100 : 0;

    return {
      ...voucher,
      redeemedCount,
      totalQuantity,
      capacity: capacity.toFixed(1),
      dailyAvg: (redeemedCount / 30).toFixed(1),
      expiresIn: this.getDaysRemaining(voucher.end_date),
    };
  }

  private normalizeVoucherData(data: any, isCreate: boolean) {
    const normalizedTargetType = this.normalizeTargetType(data.target_type);
    const normalizedData = this.pickEditableVoucherFields(data);

    if (normalizedTargetType !== undefined) {
      normalizedData.target_type = normalizedTargetType;
    } else if (isCreate) {
      normalizedData.target_type = 'all_buyers';
    }

    if (normalizedData.code) normalizedData.code = String(normalizedData.code).toUpperCase().trim();
    if (normalizedData.discount_value != null) normalizedData.discount_value = this.toAmount(normalizedData.discount_value);
    if (normalizedData.min_spend != null) normalizedData.min_spend = this.toAmount(normalizedData.min_spend);
    if (normalizedData.max_discount != null) normalizedData.max_discount = this.toAmount(normalizedData.max_discount);
    if (data.start_date) normalizedData.start_date = new Date(data.start_date);
    if (data.end_date) normalizedData.end_date = new Date(data.end_date);
    if (normalizedData.total_quantity != null) normalizedData.total_quantity = Number(normalizedData.total_quantity);
    if (normalizedData.max_per_user != null) normalizedData.max_per_user = Number(normalizedData.max_per_user);
    if (isCreate && !data.max_per_user) normalizedData.max_per_user = 1;
    if (isCreate && !data.status) normalizedData.status = 'scheduled';
    if (!isCreate && normalizedData.max_discount === undefined && data.max_discount === null) {
      normalizedData.max_discount = null;
    }

    return normalizedData;
  }

  private pickEditableVoucherFields(data: any) {
    return this.editableVoucherFields.reduce((payload, field) => {
      if (data[field] !== undefined) {
        payload[field] = data[field];
      }

      return payload;
    }, {} as Record<(typeof this.editableVoucherFields)[number], any>);
  }

  private normalizeTargetType(targetType: unknown) {
    if (typeof targetType !== 'string') {
      return undefined;
    }

    const normalizedTargetType = targetType === 'follower' ? 'followers' : targetType;

    return this.allowedTargetTypes.includes(normalizedTargetType as (typeof this.allowedTargetTypes)[number])
      ? normalizedTargetType
      : 'all_buyers';
  }

  getVoucherTargetErrorMessage(targetType: string | null | undefined) {
    if (targetType === 'new_buyer') {
      return 'This voucher is for new users only';
    }

    if (targetType === 'followers' || targetType === 'follower') {
      return 'This voucher is only available to followers of this shop';
    }

    return 'This voucher is not available for your account';
  }

  private toAmount(value: unknown) {
    if (typeof value === 'number') {
      return Number(value.toFixed(2));
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
    }

    if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
      return Number((value as any).toNumber().toFixed(2));
    }

    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
  }
}

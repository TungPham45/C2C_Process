import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

type LocationLevel = 'province' | 'ward';

interface LocationTreeNode {
  id: number;
  name: string;
  code: string;
  level: LocationLevel;
  unitType: string;
  status: 'active' | 'inactive';
  isActive: boolean;
  parentId: number | null;
  parentName: string | null;
  childrenCount: number;
  updatedAt: string | null;
  children: LocationTreeNode[];
}

const LOCATION_LEVELS: LocationLevel[] = ['province', 'ward'];

const LOCATION_TYPE_LABELS: Record<string, string> = {
  province: 'Tỉnh/Thành phố',
  ward: 'Phường/Xã',
  tinh: 'Tỉnh',
  thanh_pho: 'Thành phố',
  phuong: 'Phường',
  xa: 'Xã',
  dac_khu: 'Đặc khu',
};

const normalizeTextValue = (value: unknown) => String(value ?? '').trim();

const normalizeLocationLevel = (value: unknown): LocationLevel => {
  const normalized = normalizeTextValue(value).toLowerCase();

  if (LOCATION_LEVELS.includes(normalized as LocationLevel)) {
    return normalized as LocationLevel;
  }

  throw new BadRequestException('Location level must be one of province or ward');
};

const normalizeStatusFilter = (value: unknown) => {
  const normalized = normalizeTextValue(value).toLowerCase();

  if (!normalized || normalized === 'all') return 'all';
  if (normalized === 'active' || normalized === 'inactive') return normalized;

  throw new BadRequestException('Status filter must be all, active, or inactive');
};

const normalizeTypeFilter = (value: unknown) => {
  const normalized = normalizeTextValue(value).toLowerCase();

  if (!normalized || normalized === 'all') return 'all';
  if (LOCATION_LEVELS.includes(normalized as LocationLevel)) return normalized as LocationLevel;

  throw new BadRequestException('Type filter must be all, province, or ward');
};

const formatLocationTypeLabel = (value: string | null | undefined, fallback: LocationLevel) =>
  LOCATION_TYPE_LABELS[value ?? ''] ?? LOCATION_TYPE_LABELS[fallback];

const matchesLocationSearch = (node: LocationTreeNode, search: string) =>
  !search || node.name.toLowerCase().includes(search) || node.code.toLowerCase().includes(search);

const matchesLocationStatus = (node: LocationTreeNode, status: 'all' | 'active' | 'inactive') =>
  status === 'all' || (status === 'active' ? node.isActive : !node.isActive);

const matchesLocationLevel = (node: LocationTreeNode, level: 'all' | LocationLevel) =>
  level === 'all' || node.level === level;

const filterLocationTree = (
  node: LocationTreeNode,
  search: string,
  level: 'all' | LocationLevel,
  status: 'all' | 'active' | 'inactive',
): LocationTreeNode | null => {
  const filteredChildren = node.children
    .map((child) => filterLocationTree(child, search, level, status))
    .filter((child): child is LocationTreeNode => Boolean(child));

  const includeCurrentNode =
    matchesLocationSearch(node, search) &&
    matchesLocationLevel(node, level) &&
    matchesLocationStatus(node, status);

  if (!includeCurrentNode && filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    childrenCount: filteredChildren.length,
    children: filteredChildren,
  };
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  private readonly authBaseUrl =
    process.env.AUTH_SERVICE_BASE_URL ?? 'http://localhost:3002/api/auth';

  private readonly productBaseUrl =
    process.env.PRODUCT_SERVICE_BASE_URL ?? 'http://localhost:3001/api/products';

  private readonly orderBaseUrl =
    process.env.ORDER_SERVICE_BASE_URL ?? 'http://localhost:3004/api/orders';

  private readonly orderServiceRootUrl = this.orderBaseUrl.replace(/\/api\/orders\/?$/, '');

  private readonly orderVoucherAdminBaseUrl = `${this.orderServiceRootUrl}/api/vouchers/internal/admin`;

  private readonly internalServiceToken =
    process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';

  private getInternalHeaders() {
    return {
      'x-internal-token': this.internalServiceToken,
    };
  }

  private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...this.getInternalHeaders(),
          ...(init?.headers ?? {}),
        },
      });
    } catch (error: any) {
      throw new BadGatewayException(`Upstream request failed: ${url} (${error.message || error})`);
    }

    if (!response.ok) {
      let upstreamMessage = '';

      try {
        const data = await response.json();
        if (typeof data?.message === 'string') {
          upstreamMessage = data.message;
        } else if (Array.isArray(data?.message)) {
          upstreamMessage = data.message.join(', ');
        }
      } catch {
        try {
          upstreamMessage = await response.text();
        } catch {
          upstreamMessage = '';
        }
      }

      throw new BadGatewayException(
        upstreamMessage || `Upstream request failed: ${url} (${response.status})`,
      );
    }

    return response.json() as Promise<T>;
  }

  async getStats() {
    const emptyOrderStats = {
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      todayOrders: 0,
      totalRevenue: 0,
    };
    const emptyVoucherStats = {
      totalVouchers: 0,
      activeVouchers: 0,
      scheduledVouchers: 0,
      expiredVouchers: 0,
      platformVouchers: 0,
      shopVouchers: 0,
      totalClaims: 0,
      usedClaims: 0,
    };

    const [authStats, productStats, orderStats, voucherStats, bannerStats] = await Promise.all([
      this.requestJson<{
        totalUsers: number;
        activeUsers: number;
        suspendedUsers: number;
      }>(`${this.authBaseUrl}/internal/admin/stats`),
      this.requestJson<{
        totalShops: number;
        activeShops: number;
        pendingApplications: number;
        totalProducts: number;
        activeProducts: number;
        pendingProducts: number;
        totalCategories: number;
        activeCategories: number;
        rootCategories: number;
        maxAttributes: number;
      }>(
        `${this.productBaseUrl}/internal/admin/stats`,
      ),
      this.requestJson<typeof emptyOrderStats>(`${this.orderBaseUrl}/internal/admin/stats`).catch(() => emptyOrderStats),
      this.requestJson<typeof emptyVoucherStats>(`${this.orderServiceRootUrl}/api/vouchers/internal/admin/stats`).catch(
        () => emptyVoucherStats,
      ),
      this.getBannerStats(),
    ]);

    return {
      totalUsers: authStats.totalUsers,
      activeUsers: authStats.activeUsers,
      suspendedUsers: authStats.suspendedUsers,
      totalShops: productStats.totalShops,
      activeShops: productStats.activeShops,
      pendingApplications: productStats.pendingApplications,
      totalProducts: productStats.totalProducts,
      activeProducts: productStats.activeProducts,
      pendingProducts: productStats.pendingProducts,
      totalCategories: productStats.totalCategories,
      activeCategories: productStats.activeCategories,
      rootCategories: productStats.rootCategories,
      maxAttributes: productStats.maxAttributes,
      ...orderStats,
      ...voucherStats,
      ...bannerStats,
    };
  }

  async getUsers(query: any = {}) {
    const { role, ...authQuery } = query;
    const authQs = new URLSearchParams(authQuery as Record<string, string>).toString();
    const authQueryStr = authQs ? `?${authQs}` : '';

    const [users, shops] = await Promise.all([
      this.requestJson<Array<any>>(`${this.authBaseUrl}/internal/admin/users${authQueryStr}`),
      this.requestJson<Array<{ owner_id: number | null, status: string | null }>>(
        `${this.productBaseUrl}/internal/admin/shops`
      ).catch(() => []),
    ]);

    // lấy ra dsach id của những ng có mở shop
    // filter(s => s.owner_id !== null): Loại bỏ những shop bị lỗi dữ liệu (không có chủ sở hữu).
    // map(s => s.owner_id): Chỉ lấy ra cái owner_id (ID của chủ shop) thay vì lấy toàn bộ object shop.
    const sellerIds = new Set(
      shops.filter(s => s.owner_id !== null).map(s => s.owner_id)
    );

    let mappedUsers = users.map(user => {
      if (user.role === 'user' && sellerIds.has(user.id)) {
        return { ...user, role: 'seller' };
      }
      return user;
    });

    if (role && role !== 'all') {
      mappedUsers = mappedUsers.filter(u => u.role === role);
    }

    return mappedUsers;
  }

  async updateUserStatus(id: number, status: string) {
    return this.requestJson<any>(
      `${this.authBaseUrl}/internal/admin/users/${id}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
  }

  async getUserGrowthAnalytics(timeframe?: string) {
    const query = timeframe && timeframe !== 'all' ? `?timeframe=${timeframe}` : '';
    return this.requestJson<Array<{ date: string; newUsers: number }>>(
      `${this.authBaseUrl}/internal/admin/analytics/user-growth${query}`
    );
  }

  async getShopSalesAnalytics(timeframe: string) {
    // 1. Lấy dữ liệu bán hàng từ order-service
    const orderData = await this.requestJson<Array<{ shop_id: number; total_revenue: number; total_orders: number }>>(
      `${this.orderBaseUrl}/internal/admin/analytics/shop-sales?timeframe=${timeframe || 'all'}`
    );

    if (!orderData || orderData.length === 0) return [];

    // 2. Lấy thông tin shop từ product-service
    const ids = orderData.map(o => o.shop_id).join(',');
    const shopDetails = await this.requestJson<Array<{ id: number; name: string | null; slug: string | null; logo_url: string | null }>>(
      `${this.productBaseUrl}/internal/admin/shops-by-ids?ids=${ids}`
    );

    // 3. Nối kết quả
    return orderData.map(orderStat => {
      const shop = shopDetails.find(s => s.id === orderStat.shop_id);
      return {
        shop_id: orderStat.shop_id,
        name: shop?.name || `Gian hàng #${orderStat.shop_id}`,
        slug: shop?.slug || '',
        logo_url: shop?.logo_url || '',
        total_revenue: orderStat.total_revenue,
        total_orders: orderStat.total_orders,
      };
    });
  }

  async getPendingShops(query: any = {}) {
    const qs = new URLSearchParams(query as Record<string, string>).toString();
    const queryStr = qs ? `?${qs}` : '';
    return this.requestJson<Array<{
      id: number;
      name: string | null;
      slug: string | null;
      owner_id: number | null;
      status: string | null;
      created_at: string | null;
    }>>(`${this.productBaseUrl}/internal/admin/pending-shops${queryStr}`);
  }

  async approveShop(id: number) {
    return this.requestJson<{ id: number; status: string | null }>(
      `${this.productBaseUrl}/internal/admin/shops/${id}/approve`,
      {
        method: 'PUT',
      },
    );
  }

  async getShops(query: any = {}) {
    const qs = new URLSearchParams(query as Record<string, string>).toString();
    const queryStr = qs ? `?${qs}` : '';
    return this.requestJson<Array<{
      id: number;
      name: string | null;
      slug: string | null;
      owner_id: number | null;
      status: string | null;
      created_at: string | null;
    }>>(`${this.productBaseUrl}/internal/admin/shops${queryStr}`);
  }

  async updateShopStatus(id: number, status: string) {
    return this.requestJson<{ id: number; status: string | null }>(
      `${this.productBaseUrl}/internal/admin/shops/${id}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
  }

  async getPendingProducts() {
    return this.requestJson<Array<any>>(`${this.productBaseUrl}/internal/admin/pending-products`);
  }

  async approveProduct(id: number) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/products/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectProduct(id: number, reason: string) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/products/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  }

  // --- LOCATIONS ---

  async getLocationSummary() {
    const [totalProvinces, totalWards, activeProvinces, activeWards] = await Promise.all([
      this.prisma.province.count(),
      this.prisma.ward.count(),
      this.prisma.province.count({ where: { is_active: true } }),
      this.prisma.ward.count({ where: { is_active: true } }),
    ]);

    const inactiveProvinces = totalProvinces - activeProvinces;
    const inactiveWards = totalWards - activeWards;

    return {
      totalProvinces,
      totalWards,
      pendingSync: inactiveProvinces + inactiveWards,
      activeUnits: activeProvinces + activeWards,
      inactiveUnits: inactiveProvinces + inactiveWards,
      updatedAt: new Date().toISOString(),
    };
  }

  async getLocations(query: any = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(25, Math.max(1, Number(query.limit) || 10));
    const search = normalizeTextValue(query.search).toLowerCase();
    const levelFilter = normalizeTypeFilter(query.type);
    const statusFilter = normalizeStatusFilter(query.status);

    const provinces = await this.prisma.province.findMany({
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      include: {
        wards: {
          orderBy: [{ code: 'asc' }, { name: 'asc' }],
        },
      },
    });

    const tree = provinces.map<LocationTreeNode>((province) => ({
      id: province.id,
      name: province.name,
      code: province.code,
      level: 'province',
      unitType: formatLocationTypeLabel(province.type, 'province'),
      status: province.is_active ? 'active' : 'inactive',
      isActive: Boolean(province.is_active),
      parentId: null,
      parentName: null,
      childrenCount: province.wards.length,
      updatedAt: province.updated_at?.toISOString() ?? null,
      children: province.wards.map<LocationTreeNode>((ward) => ({
        id: ward.id,
        name: ward.name,
        code: ward.code,
        level: 'ward',
        unitType: formatLocationTypeLabel(ward.type, 'ward'),
        status: ward.is_active ? 'active' : 'inactive',
        isActive: Boolean(ward.is_active),
        parentId: province.id,
        parentName: province.name,
        childrenCount: 0,
        updatedAt: ward.updated_at?.toISOString() ?? null,
        children: [],
      })),
    }));

    const filteredRoots = tree
      .map((node) => filterLocationTree(node, search, levelFilter, statusFilter))
      .filter((node): node is LocationTreeNode => Boolean(node));

    const total = filteredRoots.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;

    return {
      items: filteredRoots.slice(startIndex, startIndex + limit),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
      filters: {
        search: normalizeTextValue(query.search),
        type: levelFilter,
        status: statusFilter,
      },
    };
  }

  async getLocationOptions() {
    const provinces = await this.prisma.province.findMany({
      where: { is_active: true },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      include: {
        wards: {
          where: { is_active: true },
          orderBy: [{ code: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            code: true,
            province_id: true,
          },
        },
      },
    });

    return {
      provinces,
    };
  }

  async createLocation(data: any) {
    const level = normalizeLocationLevel(data?.level);
    const name = normalizeTextValue(data?.name);
    const code = normalizeTextValue(data?.code);
    const administrativeType = normalizeTextValue(data?.administrativeType);
    const isActive = data?.isActive !== false;
    const parentId = data?.parentId ? Number(data.parentId) : null;

    if (!name) throw new BadRequestException('Location name is required');
    if (!code) throw new BadRequestException('Location code is required');

    await this.ensureLocationCodeIsUnique(level, code);

    if (level === 'province') {
      return this.prisma.province.create({
        data: {
          name,
          code,
          type: administrativeType || null,
          is_active: isActive,
        },
      });
    }

    if (!parentId) throw new BadRequestException('A ward must belong to a province');

    const province = await this.prisma.province.findUnique({ where: { id: parentId } });
    if (!province) throw new NotFoundException('Province not found');

    return this.prisma.ward.create({
      data: {
        province_id: province.id,
        name,
        code,
        type: administrativeType || null,
        is_active: isActive,
      },
    });
  }

  async updateLocation(levelValue: string, id: number, data: any) {
    const level = normalizeLocationLevel(levelValue);
    const name = normalizeTextValue(data?.name);
    const code = normalizeTextValue(data?.code);
    const administrativeType = normalizeTextValue(data?.administrativeType);
    const isActive = data?.isActive !== false;

    if (!name) throw new BadRequestException('Location name is required');
    if (!code) throw new BadRequestException('Location code is required');

    await this.ensureLocationCodeIsUnique(level, code, id);

    if (level === 'province') {
      await this.ensureProvinceExists(id);
      return this.prisma.province.update({
        where: { id },
        data: {
          name,
          code,
          type: administrativeType || null,
          is_active: isActive,
        },
      });
    }

    await this.ensureWardExists(id);
    return this.prisma.ward.update({
      where: { id },
      data: {
        name,
        code,
        type: administrativeType || null,
        is_active: isActive,
      },
    });
  }

  async updateLocationStatus(levelValue: string, id: number, isActive: boolean) {
    const level = normalizeLocationLevel(levelValue);

    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }

    const location =
      level === 'province'
        ? await this.prisma.province.findUnique({ where: { id } })
        : await this.prisma.ward.findUnique({ where: { id } });

    if (!location) {
      throw new NotFoundException('Không tìm thấy địa giới hành chính');
    }

    const code = location.code;

    if (level === 'province') {
      await this.prisma.$transaction([
        this.prisma.province.update({
          where: { id },
          data: { is_active: isActive },
        }),
        this.prisma.ward.updateMany({
          where: { province_id: id },
          data: { is_active: isActive },
        }),
      ]);
    } else {
      await this.prisma.ward.update({
        where: { id },
        data: { is_active: isActive },
      });
    }

    try {
      await fetch(`${this.authBaseUrl}/internal/admin/addresses/update-status-by-location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getInternalHeaders(),
        },
        body: JSON.stringify({
          level,
          code,
          status: isActive ? 'active' : 'Cần thay đổi',
        }),
      });
    } catch (error) {
      console.error('Failed to notify auth-service about location status change:', error);
    }

    return { success: true };
  }

  async deleteLocation(levelValue: string, id: number) {
    const level = normalizeLocationLevel(levelValue);

    const location =
      level === 'province'
        ? await this.prisma.province.findUnique({ where: { id } })
        : await this.prisma.ward.findUnique({ where: { id } });

    if (!location) {
      throw new NotFoundException('Không tìm thấy địa giới hành chính');
    }

    const code = location.code;

    if (level === 'province') {
      await this.prisma.$transaction([
        this.prisma.ward.deleteMany({ where: { province_id: id } }),
        this.prisma.province.delete({ where: { id } }),
      ]);
    } else {
      await this.prisma.ward.delete({ where: { id } });
    }

    try {
      await fetch(`${this.authBaseUrl}/internal/admin/addresses/update-status-by-location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getInternalHeaders(),
        },
        body: JSON.stringify({
          level,
          code,
          status: 'Cần thay đổi',
        }),
      });
    } catch (error) {
      console.error('Failed to notify auth-service about location deletion:', error);
    }

    return { success: true };
  }

  // --- CATEGORIES ---

  async getCategories() {
    return this.requestJson<Array<any>>(`${this.productBaseUrl}/internal/admin/categories`);
  }

  async getCategoryById(id: number) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/categories/${id}`);
  }

  async createCategory(data: any) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: number, data: any) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getCategoryDeleteImpact(id: number) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/categories/${id}/delete-impact`);
  }

  async deleteCategory(id: number, data?: any) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/categories/${id}`, {
      method: 'DELETE',
      headers: data ? { 'Content-Type': 'application/json' } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // --- ATTRIBUTES ---

  async getCategoryAttributes(categoryId: number) {
    return this.requestJson<Array<any>>(`${this.productBaseUrl}/internal/admin/categories/${categoryId}/attributes`);
  }

  async createAttribute(categoryId: number, data: any) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/categories/${categoryId}/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async updateAttribute(id: number, data: any) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/attributes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteAttribute(id: number) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/attributes/${id}`, {
      method: 'DELETE',
    });
  }

  async createAttributeOption(attributeId: number, data: any) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/attributes/${attributeId}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async updateAttributeOption(id: number, data: any) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/attribute-options/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteAttributeOption(id: number) {
    return this.requestJson<any>(`${this.productBaseUrl}/internal/admin/attribute-options/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Banners ---

  async getAllBanners() {
    return this.prisma.banner.findMany({
      orderBy: { sort_order: 'asc' },
    });
  }

  async getActiveBanners() {
    const banners = await this.prisma.banner.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
    return banners;
  }

  async getBannerStats() {
    const [totalBanners, activeBanners, inactiveBanners] = await Promise.all([
      this.prisma.banner.count(),
      this.prisma.banner.count({ where: { is_active: true } }),
      this.prisma.banner.count({ where: { is_active: false } }),
    ]);

    return {
      totalBanners,
      activeBanners,
      inactiveBanners,
    };
  }

  async createBanner(data: { title: string; image_url: string; target_url?: string; is_active?: boolean; sort_order?: number }) {
    return this.prisma.banner.create({
      data,
    });
  }

  async updateBanner(id: number, data: { title?: string; image_url?: string; target_url?: string; is_active?: boolean; sort_order?: number }) {
    return this.prisma.banner.update({
      where: { id },
      data,
    });
  }

  async deleteBanner(id: number) {
    return this.prisma.banner.delete({
      where: { id },
    });
  }

  // --- VOUCHERS ---

  async getAllVouchers() {
    return this.requestJson<Array<any>>(this.orderVoucherAdminBaseUrl);
  }

  async getVoucherById(id: number) {
    return this.requestJson<any>(`${this.orderVoucherAdminBaseUrl}/${id}`);
  }

  async deleteVoucher(id: number) {
    return this.requestJson<any>(`${this.orderVoucherAdminBaseUrl}/${id}`, {
      method: 'DELETE',
    });
  }

  // --- REPORT HELPERS ---

  async getShopsByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.requestJson<Array<{ id: number; name: string | null; owner_id: number | null; slug: string | null; logo_url: string | null }>>(
      `${this.productBaseUrl}/internal/admin/shops-by-ids?ids=${ids.join(',')}`
    ).catch(() => [] as any[]);
  }

  async getProductsByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.requestJson<Array<{ id: number; name: string | null; shop_id: number | null }>>(
      `${this.productBaseUrl}/internal/admin/products-by-ids?ids=${ids.join(',')}`
    ).catch(() => [] as any[]);
  }

  async adminUpdateProductStatus(id: number, status: string, note?: string) {
    return this.requestJson<any>(
      `${this.productBaseUrl}/internal/admin/products/${id}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, moderation_note: note }),
      }
    );
  }

  async hydrateReports(reports: any[]) {
    if (!reports.length) return reports;

    const shopIds = [...new Set(reports.map(r => r.shop_id).filter(Boolean))] as number[];
    const productIds = [...new Set(reports.map(r => r.product_id).filter(Boolean))] as number[];
    const reporterIds = [...new Set(reports.map(r => r.reporter_id).filter(Boolean))] as number[];

    const [shops, products, users] = await Promise.all([
      shopIds.length ? this.getShopsByIds(shopIds) : Promise.resolve([]),
      productIds.length ? this.getProductsByIds(productIds) : Promise.resolve([]),
      reporterIds.length
        ? this.requestJson<any[]>(`${this.authBaseUrl}/internal/admin/users-by-ids?ids=${reporterIds.join(',')}`)
          .catch(() => [] as any[])
        : Promise.resolve([]),
    ]);

    const shopMap = Object.fromEntries((shops as any[]).map((s: any) => [s.id, s]));
    const productMap = Object.fromEntries((products as any[]).map((p: any) => [p.id, p]));
    const userMap = Object.fromEntries((users as any[]).map((u: any) => [u.id, u]));

    return reports.map(report => {
      const shop = report.shop_id ? (shopMap[report.shop_id] ?? null) : null;
      const product = report.product_id ? (productMap[report.product_id] ?? null) : null;
      const reporter = report.reporter_id ? (userMap[report.reporter_id] ?? null) : null;

      return {
        ...report,
        shop_name: shop?.name || null,
        product_name: product?.name || null,
        reporter_name: reporter?.name || reporter?.full_name || null,
        shop,
        product,
        reporter,
      };
    });
  }

  // --- WALLETS & TRANSACTIONS ---

  private readonly walletInternalBaseUrl = `${this.authBaseUrl}/wallet/internal/admin`;

  async getWalletStats() {
    return this.requestJson<any>(`${this.walletInternalBaseUrl}/stats`);
  }

  async getAllWallets(page?: string, limit?: string) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.requestJson<any>(`${this.walletInternalBaseUrl}/wallets${query}`);
  }

  async getWalletByUserId(userId: number) {
    return this.requestJson<any>(`${this.walletInternalBaseUrl}/wallets/${userId}`);
  }

  async getAllTransactions(type?: string, status?: string, userId?: string, page?: string, limit?: string) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (userId) params.set('userId', userId);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.requestJson<any>(`${this.walletInternalBaseUrl}/transactions${query}`);
  }

  async getTransactionById(id: number) {
    return this.requestJson<any>(`${this.walletInternalBaseUrl}/transactions/${id}`);
  }

  async updateTransactionStatus(id: number, status: string) {
    return this.requestJson<any>(`${this.walletInternalBaseUrl}/transactions/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  // --- SELLER PAYOUTS ---

  private readonly orderPayoutAdminBaseUrl = `${this.orderBaseUrl}/internal/admin/payouts`;

  async getPayouts(status?: string, shopId?: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (shopId) params.set('shopId', shopId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.requestJson<any>(`${this.orderPayoutAdminBaseUrl}${query}`);
  }

  async processEligiblePayouts() {
    return this.requestJson<any>(`${this.orderPayoutAdminBaseUrl}/process-eligible`, {
      method: 'POST',
    });
  }

  async releasePayout(shopOrderId: number) {
    return this.requestJson<any>(`${this.orderPayoutAdminBaseUrl}/${shopOrderId}/release`, {
      method: 'POST',
    });
  }

  private async ensureLocationCodeIsUnique(level: LocationLevel, code: string, ignoreId?: number) {
    if (level === 'province') {
      const existing = await this.prisma.province.findFirst({
        where: {
          code,
          ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
        },
      });

      if (existing) {
        throw new ConflictException('Province code already exists');
      }

      return;
    }

    const existing = await this.prisma.ward.findFirst({
      where: {
        code,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Ward code already exists');
    }
  }

  private async ensureProvinceExists(id: number) {
    const province = await this.prisma.province.findUnique({ where: { id } });

    if (!province) {
      throw new NotFoundException('Province not found');
    }

    return province;
  }

  private async ensureWardExists(id: number) {
    const ward = await this.prisma.ward.findUnique({ where: { id } });

    if (!ward) {
      throw new NotFoundException('Ward not found');
    }

    return ward;
  }
}

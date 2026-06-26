import { Injectable, NotFoundException, UnauthorizedException, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const MAX_ATTRIBUTES_PER_CATEGORY = 8;
@Injectable()
export class ProductService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) { }

  private async sendNotification(data: { user_id: number; title: string; message: string; type: string; link?: string }) {
    try {
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3002/api/auth';
      const notificationUrl = authUrl.replace(/\/api\/auth\/?$/, '/api/notifications/internal');
      await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error('[PRODUCT NOTIFICATION ERROR]', e);
    }
  }

  private async getUsersByIds(userIds: number[]) {
    if (!userIds.length) return new Map<number, { id: number; full_name?: string | null; avatar_url?: string | null }>();
    try {
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3002/api/auth';
      const token = process.env.INTERNAL_SERVICE_TOKEN || 'internal-dev-token';
      const ids = Array.from(new Set(userIds)).join(',');
      const res = await fetch(`${authUrl}/internal/admin/users-by-ids?ids=${ids}`, {
        headers: {
          'x-internal-token': token,
        },
      });
      if (!res.ok) {
        return new Map();
      }
      const users = await res.json();
      return new Map(
        (Array.isArray(users) ? users : []).map((user: any) => [
          Number(user.id),
          {
            id: Number(user.id),
            full_name: user.full_name ?? null,
            avatar_url: user.avatar_url ?? null,
          },
        ]),
      );
    } catch {
      return new Map();
    }
  }

  private async getCategoryLineageIds(categoryId: number) {
    const lineage: number[] = [];
    const visited = new Set<number>();
    let currentCategoryId: number | null = categoryId;

    while (currentCategoryId && !visited.has(currentCategoryId)) {
      visited.add(currentCategoryId);

      const category = await this.prisma.category.findUnique({
        where: { id: currentCategoryId },
        select: { id: true, parent_id: true },
      });

      if (!category) {
        break;
      }

      lineage.unshift(category.id);
      currentCategoryId = category.parent_id ?? null;
    }

    return lineage;
  }

  private async getCategoryDescendantIds(categoryId: number) {
    const categories = await this.prisma.category.findMany({
      where: { is_active: true },
      select: { id: true, parent_id: true },
    });

    const childrenByParent = new Map<number, number[]>();
    for (const category of categories) {
      if (category.parent_id == null) {
        continue;
      }

      const children = childrenByParent.get(category.parent_id) ?? [];
      children.push(category.id);
      childrenByParent.set(category.parent_id, children);
    }

    const descendantIds: number[] = [];
    const visited = new Set<number>();
    const queue = [categoryId];

    while (queue.length > 0) {
      const currentCategoryId = queue.shift();
      if (!currentCategoryId || visited.has(currentCategoryId)) {
        continue;
      }

      visited.add(currentCategoryId);
      descendantIds.push(currentCategoryId);

      const childIds = childrenByParent.get(currentCategoryId) ?? [];
      queue.push(...childIds);
    }

    return descendantIds;
  }

  private async findSellerShopAnyStatus(userId: number) {
    return this.prisma.shop.findFirst({
      where: { owner_id: userId },
      select: {
        id: true,
        owner_id: true,
        name: true,
        slug: true,
        description: true,
        logo_url: true,
        rating: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            followers: true,
            products: true
          }
        }
      },
    });
  }

  private async findActiveSellerShop(userId: number) {
    return this.prisma.shop.findFirst({
      where: {
        owner_id: userId,
        status: 'active'
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
        slug: true,
        logo_url: true,
        rating: true,
        status: true
      }
    });
  }

  private async requireActiveSellerShop(userId: number) {
    const shop = await this.findActiveSellerShop(userId);
    if (!shop) {
      throw new UnauthorizedException('No active seller shop found for this user');
    }
    return shop;
  }

  private async requireActiveShop(shopId: number) {
    const shop = await this.prisma.shop.findFirst({
      where: {
        id: shopId,
        status: 'active',
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
        slug: true,
        description: true,
        logo_url: true,
        rating: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found or not active');
    }

    return shop;
  }

  // =====================
  // SELLER CONTEXT (CRUD)
  // =====================

  // Update shop profile (name, description, logo)
  async updateShop(userId: number, data: { name?: string; description?: string; logo_url?: string }) {
    const shop = await this.findSellerShopAnyStatus(userId);
    if (!shop) {
      throw new UnauthorizedException('No seller shop found for this user');
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) throw new BadRequestException('Tên shop không được để trống');
      if (trimmedName.length > 255) throw new BadRequestException('Tên shop quá dài (tối đa 255 ký tự)');
      
      // Thêm kiểm tra trùng tên shop (bỏ qua shop hiện tại)
      if (trimmedName.toLowerCase() !== shop.name?.toLowerCase()) {
        const existingName = await this.prisma.shop.findFirst({
          where: {
            name: { equals: trimmedName, mode: 'insensitive' }
          }
        });
        if (existingName) {
          throw new BadRequestException('Tên shop đã tồn tại, vui lòng chọn tên khác');
        }
      }

      updateData.name = trimmedName;
    }

    // We can also let the user clear the description, or max length it if needed. Prisma Text type is huge so length isn't a hard limit crash here.
    if (data.description !== undefined) {
      updateData.description = data.description.trim();
    }

    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;

    return this.prisma.shop.update({
      where: { id: shop.id },
      data: updateData,
    });
  }

  // Delete shop (revert to normal user)
  async deleteShop(userId: number) {
    const shop = await this.findSellerShopAnyStatus(userId);
    if (!shop) {
      throw new UnauthorizedException('No seller shop found for this user');
    }

    // Xóa shop (cascade delete toàn bộ product, review, follow liên quan)
    return this.prisma.shop.delete({
      where: { id: shop.id }
    });
  }

  // Get aggregated dashboard metrics
  async getSellerMetrics(userId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    // "Chờ duyệt" historically used different statuses across modules.
    // Count all non-active states that represent moderation queue.
    const [active, pending] = await Promise.all([
      this.prisma.product.count({ where: { shop_id: shop.id, status: 'active' } }),
      this.prisma.product.count({
        where: {
          shop_id: shop.id,
          status: { in: ['draft', 'pending_approval', 'pending'] },
        },
      }),
    ]);

    return {
      activeProducts: active,
      pendingProducts: pending,
      totalRevenue: '0.00', // Mock data pending Phase 5 Order Service
      pendingOrders: 0      // Mock data pending Phase 5 Order Service
    };
  }

  // Get deep analytics data (combining product views + remote order revenue)
  async getSellerAnalytics(userId: number, days: number = 10) {
    const shop = await this.requireActiveSellerShop(userId);

    // 1. Fetch Product Metrics (totalViews, topProducts)
    const [viewAgg, topProducts] = await Promise.all([
      this.prisma.product.aggregate({
        where: { shop_id: shop.id },
        _sum: { view_count: true },
      }),
      this.prisma.product.findMany({
        where: { shop_id: shop.id },
        orderBy: { sold_count: 'desc' },
        take: 5,
        select: { name: true, sold_count: true }
      })
    ]);

    const totalViews = viewAgg._sum.view_count || 0;
    const topProductsData = topProducts.map(p => ({
      name: p.name,
      sales: p.sold_count || 0
    }));

    if (topProductsData.length === 0) {
      topProductsData.push({ name: 'Chưa có sản phẩm', sales: 0 });
    }

    // 2. Fetch Order Metrics from order-service
    let totalOrders = 0;
    let totalRevenue = 0;
    let trendData: Array<{ date: string; views: number; revenue: number; orders: number }> = [];

    try {
      const orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004/api/orders';
      const token = process.env.INTERNAL_SERVICE_TOKEN || 'internal-dev-token';
      const res = await fetch(`${orderUrl}/internal/seller-analytics?shopId=${shop.id}&days=${days}`, {
        headers: { 'x-internal-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        totalOrders = data.totalOrders || 0;
        totalRevenue = data.totalRevenue || 0;
        if (Array.isArray(data.topProductsData) && data.topProductsData.length > 0) {
          topProductsData.splice(
            0,
            topProductsData.length,
            ...data.topProductsData.map((p: any) => ({
              name: String(p?.name || 'Sản phẩm chưa xác định'),
              sales: Number(p?.sales) || 0,
            })),
          );
        }

        // Spread views evenly as approximation, since we only track a total counter natively
        const avgViews = totalViews > 0 ? Math.round(totalViews / days) : 0;
        trendData = (data.trendData || []).map((t: any) => ({
          date: t.date,
          orders: t.orders,
          revenue: t.revenue,
          views: avgViews
        }));
      } else {
        console.error('[product-service] Order analytics API failed', res.status);
      }
    } catch (e: any) {
      console.error('[product-service] Failed to fetch order analytics (Network error)', e.message);
    }

    // Fallback if order service is down
    if (trendData.length === 0) {
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const iterDate = new Date(today);
        iterDate.setDate(iterDate.getDate() - i);
        const key = `${iterDate.getDate()}/${iterDate.getMonth() + 1}`;
        trendData.push({
          date: key,
          orders: 0,
          revenue: 0,
          views: Math.round(totalViews / days) || 0
        });
      }
    }

    // Calculate real conversion rate 
    // unique visitors would be ideal, but we use views as proxy.
    const conversionRate = totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(1) : '0';

    return {
      totalViews,
      totalOrders,
      totalRevenue,
      conversionRate,
      topProductsData,
      trendData
    };
  }

  // Helper: generate a URL-safe slug from name + timestamp
  private generateSlug(name: string): string {
    const base = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${base}-${Date.now()}`;
  }

  private normalizeCategoryName(name: string) {
    return name.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();
  }

  private getValidCategoryName(name: unknown) {
    const trimmedName = String(name ?? '').trim();
    if (!trimmedName) {
      throw new BadRequestException('Category name is required');
    }

    return trimmedName;
  }

  private async ensureCategoryNameIsUnique(name: string, shopId: number | null, excludedCategoryId?: number) {
    const normalizedName = this.normalizeCategoryName(name);
    const where: any = { shop_id: shopId };

    if (excludedCategoryId !== undefined) {
      where.id = { not: excludedCategoryId };
    }

    const categories = await this.prisma.category.findMany({
      where,
      select: { name: true },
    });

    const duplicate = categories.some(
      (category) => this.normalizeCategoryName(category.name) === normalizedName,
    );

    if (duplicate) {
      throw new BadRequestException('Category name already exists');
    }
  }

  private getValidAttributeName(name: unknown) {
    const trimmedName = String(name ?? '').trim();
    if (!trimmedName) {
      throw new BadRequestException('Attribute name is required');
    }

    return trimmedName;
  }

  private async ensureAttributeNameIsUnique(categoryId: number, name: string, excludedAttributeId?: number) {
    const normalizedName = this.normalizeCategoryName(name);
    const where: any = { category_id: categoryId };

    if (excludedAttributeId !== undefined) {
      where.id = { not: excludedAttributeId };
    }

    const attributes = await this.prisma.attributeDefinition.findMany({
      where,
      select: { name: true },
    });

    const duplicate = attributes.some(
      (attribute) => this.normalizeCategoryName(attribute.name) === normalizedName,
    );

    if (duplicate) {
      throw new BadRequestException('Attribute name already exists');
    }
  }

  private async ensureCategoryAttributeLimitNotExceeded(categoryId: number) {
    const attributeCount = await this.prisma.attributeDefinition.count({
      where: { category_id: categoryId },
    });

    if (attributeCount >= MAX_ATTRIBUTES_PER_CATEGORY) {
      throw new BadRequestException(
        `A category can have at most ${MAX_ATTRIBUTES_PER_CATEGORY} attributes.`,
      );
    }
  }

  private getValidAttributeOptionName(name: unknown) {
    const trimmedName = String(name ?? '').trim();
    if (!trimmedName) {
      throw new BadRequestException('Attribute option name is required');
    }

    return trimmedName;
  }

  private async ensureAttributeOptionNameIsUnique(attributeId: number, name: string, excludedOptionId?: number) {
    const normalizedName = this.normalizeCategoryName(name);
    const where: any = { attribute_id: attributeId };

    if (excludedOptionId !== undefined) {
      where.id = { not: excludedOptionId };
    }

    const options = await this.prisma.attributeOption.findMany({
      where,
      select: { value_name: true },
    });

    const duplicate = options.some(
      (option) => this.normalizeCategoryName(option.value_name) === normalizedName,
    );

    if (duplicate) {
      throw new BadRequestException('Attribute option name already exists');
    }
  }

  // Create a new product

  async createProduct(userId: number, data: any) {
    try {
      const shop = await this.requireActiveSellerShop(userId);
      console.log('[CREATE] Incoming data:', JSON.stringify(data, null, 2));
      const slug = this.generateSlug(data.name || 'product');
      const defaultSku = `DEFAULT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Step 1: Create the base product
      console.log('[CREATE] Step 1: Creating product...');
      const product = await this.prisma.product.create({
        data: {
          shop_id: shop.id,
          name: data.name,
          slug: slug,
          description: data.description || '',
          category_id: Number(data.category_id) || 1,
          base_price: Number(data.base_price),
          thumbnail_url: data.thumbnail_url || '',
          shop_categories: data.shop_category_ids && Array.isArray(data.shop_category_ids)
            ? { connect: data.shop_category_ids.map((id: number) => ({ id: Number(id) })) }
            : undefined
        }
      });
      console.log('[CREATE] Step 1 done. Product ID:', product.id);

      // Step 2: Create images (replace blobs with placeholders)
      const images = (data.images || []).length > 0 ? data.images : [data.thumbnail_url];
      const processedImages = images.map((url: string, index: number) => ({
        product_id: product.id,
        image_url: url,
        is_primary: index === 0,
        sort_order: index
      }));

      console.log('[CREATE] Step 2: Creating', processedImages.length, 'images...');
      await this.prisma.productImage.createMany({ data: processedImages });

      // Step 3: Create variants
      const variantData = data.has_variants && data.variants && data.variants.length > 0
        ? data.variants.map((v: any, idx: number) => ({
          product_id: product.id,
          sku: v.sku ? `${v.sku}-v${idx}` : `${slug}-v${idx}`,
          stock_quantity: Number(v.stock) || 0,
          price_override: Number(v.price) || Number(data.base_price),
          attributes: v.attributes || {}
        }))
        : [{
          product_id: product.id,
          sku: defaultSku,
          stock_quantity: Number(data.base_stock) || 0,
          price_override: Number(data.base_price),
          attributes: {}
        }];
      console.log('[CREATE] Step 3: Creating', variantData.length, 'variants...');
      await this.prisma.productVariant.createMany({ data: variantData });

      // Step 3.5: Save variant images
      if (data.has_variants && data.variants && data.variants.length > 0) {
        console.log('[CREATE] Step 3.5: Saving variant images...');
        const createdVariants = await this.prisma.productVariant.findMany({ where: { product_id: product.id } });
        for (let idx = 0; idx < data.variants.length; idx++) {
          const v = data.variants[idx];
          console.log('[CREATE] Variant', idx, 'image:', v.image);
          if (v.image) {
            const savedVariant = createdVariants.find((cv: any) => cv.attributes && JSON.stringify(cv.attributes) === JSON.stringify(v.attributes));
            if (savedVariant) {
              await this.prisma.productImage.create({
                data: { product_id: product.id, variant_id: savedVariant.id, image_url: v.image, is_primary: false, sort_order: 100 + idx }
              });
              console.log('[CREATE] Saved image for variant', savedVariant.id);
            }
          }
        }
      }

      // Step 4: Create attribute values
      if (data.attributeValues && Object.keys(data.attributeValues).length > 0) {
        console.log('[CREATE] Step 4: Creating attribute values...');
        const attrEntries = Object.entries(data.attributeValues).filter(([, v]) => v);
        if (attrEntries.length > 0) {
          await this.prisma.productAttributeValue.createMany({
            data: attrEntries.map(([attrId, value]) => {
              const numericVal = Number(value);
              return {
                product_id: product.id,
                attribute_id: Number(attrId),
                attribute_option_id: !isNaN(numericVal) && numericVal > 0 ? numericVal : null,
                custom_value: isNaN(numericVal) || numericVal <= 0 ? String(value) : null
              };
            })
          });
        }
      }

      // Step 5: Fetch complete product with relations
      console.log('[CREATE] Step 5: Fetching complete product...');
      const result = await this.prisma.product.findUnique({
        where: { id: product.id },
        include: { variants: true, images: true, attribute_values: true, category: true, shop_categories: true }
      });

      console.log('[CREATE] Done! Product:', result?.id);
      return result;
    } catch (error: any) {
      console.error('[ProductService] createProduct error:', error.message || error);
      throw error;
    }
  }

  // Get all products for a specific seller (shop)
  async getShopProducts(userId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    return this.prisma.product.findMany({
      where: { shop_id: shop.id },
      include: {
        category: true,
        images: true,
        variants: true,
        shop_categories: true,
        _count: { select: { reviews: true } }
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Update a product (ensure the seller owns it)
  async updateProduct(userId: number, productId: number, data: any) {
    try {
      const shop = await this.requireActiveSellerShop(userId);
      console.log('[UPDATE] Incoming data for product:', productId);
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.shop_id !== shop.id) throw new UnauthorizedException('Not the owner of this product');

      const slug = this.generateSlug(data.name || 'product');
      const defaultSku = `DEFAULT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Step 1: Clean up all old relations
      console.log('[UPDATE] Step 1: Cleaning old relations...');
      await this.prisma.productAttributeValue.deleteMany({ where: { product_id: productId } });
      await this.prisma.productImage.deleteMany({ where: { product_id: productId } });
      await this.prisma.productVariant.deleteMany({ where: { product_id: productId } });

      // Step 2: Update base product fields
      console.log('[UPDATE] Step 2: Updating product fields...');
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          description: data.description || '',
          category_id: Number(data.category_id) || product.category_id,
          base_price: Number(data.base_price),
          thumbnail_url: data.thumbnail_url || '',
          shop_categories: data.shop_category_ids !== undefined
            ? { set: Array.isArray(data.shop_category_ids) ? data.shop_category_ids.map((id: number) => ({ id: Number(id) })) : [] }
            : undefined
        }
      });

      // Step 3: Create images (replace blobs with placeholders)
      const images = (data.images || []).length > 0 ? data.images : [data.thumbnail_url];
      const processedImages = images.map((url: string, index: number) => ({
        product_id: productId,
        image_url: url,
        is_primary: index === 0,
        sort_order: index
      }));

      console.log('[UPDATE] Step 3: Creating', processedImages.length, 'images...');
      await this.prisma.productImage.createMany({ data: processedImages });

      // Step 4: Create variants
      const variantData = data.has_variants && data.variants && data.variants.length > 0
        ? data.variants.map((v: any, idx: number) => ({
          product_id: productId,
          sku: v.sku ? `${v.sku}-v${idx}` : `${slug}-v${idx}`,
          stock_quantity: Number(v.stock) || 0,
          price_override: Number(v.price) || Number(data.base_price),
          attributes: v.attributes || {}
        }))
        : [{
          product_id: productId,
          sku: defaultSku,
          stock_quantity: Number(data.base_stock) || 0,
          price_override: Number(data.base_price),
          attributes: {}
        }];
      console.log('[UPDATE] Step 4: Creating', variantData.length, 'variants...');
      await this.prisma.productVariant.createMany({ data: variantData });

      // Step 4.5: Save variant images
      if (data.has_variants && data.variants && data.variants.length > 0) {
        console.log('[UPDATE] Step 4.5: Saving variant images...');
        const createdVariants = await this.prisma.productVariant.findMany({ where: { product_id: productId } });
        for (let idx = 0; idx < data.variants.length; idx++) {
          const v = data.variants[idx];
          if (v.image) {
            const savedVariant = createdVariants.find((cv: any) => cv.attributes && JSON.stringify(cv.attributes) === JSON.stringify(v.attributes));
            if (savedVariant) {
              await this.prisma.productImage.create({
                data: { product_id: productId, variant_id: savedVariant.id, image_url: v.image, is_primary: false, sort_order: 100 + idx }
              });
            }
          }
        }
      }

      // Step 5: Create attribute values
      if (data.attributeValues && Object.keys(data.attributeValues).length > 0) {
        console.log('[UPDATE] Step 5: Creating attribute values...');
        const attrEntries = Object.entries(data.attributeValues).filter(([, v]) => v);
        if (attrEntries.length > 0) {
          await this.prisma.productAttributeValue.createMany({
            data: attrEntries.map(([attrId, value]) => {
              const numericVal = Number(value);
              return {
                product_id: productId,
                attribute_id: Number(attrId),
                attribute_option_id: !isNaN(numericVal) && numericVal > 0 ? numericVal : null,
                custom_value: isNaN(numericVal) || numericVal <= 0 ? String(value) : null
              };
            })
          });
        }
      }

      // Step 6: Return complete product
      console.log('[UPDATE] Step 6: Fetching updated product...');
      const result = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true, images: true, attribute_values: true, category: true, shop_categories: true }
      });

      console.log('[UPDATE] Done! Product:', result?.id);
      return result;
    } catch (error: any) {
      console.error('[ProductService] updateProduct error:', error.message || error);
      throw error;
    }
  }

  // Get a single product for seller editing (no status filter, all relations)
  async getSellerContext(userId: number) {
    // lấy ra shop đầu tiên mà user sở hữu
    const shop = await this.findSellerShopAnyStatus(userId);
    return {
      isSeller: !!shop,
      shop
    };
  }
  /*
  - !!shop: Dấu !! (double bang) là cách viết tắt trong JavaScript/TypeScript để ép một giá trị về kiểu Boolean.
    Nó kiểm tra xem shop có tồn tại (không phải null hay undefined) hay không.
  - shop.status === 'active': Kiểm tra xem trạng thái của cửa hàng có đang là active (đã được duyệt/đang hoạt động) hay không.
  - Kết luận: isSeller chỉ trả về true khi và chỉ khi người dùng đã có cửa hàng VÀ cửa hàng đó đã được ban quản trị duyệt (active).
    Nếu cửa hàng đang ở trạng thái pending (chờ duyệt) hoặc người dùng chưa có cửa hàng, isSeller sẽ là false.
  */

  async registerShop(userId: number, data: any) { //data -> dlieu nhập từ form
    const existingShop = await this.findSellerShopAnyStatus(userId);
    if (existingShop) {
      throw new BadRequestException('You have already registered a shop'); // http 400
    }

    const name = String(data?.name || '').trim();
    if (!name) {
      throw new BadRequestException('Shop name is required');
    }

    // Kiểm tra trùng tên shop
    const nameExists = await this.prisma.shop.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' }
      }
    });
    if (nameExists) {
      throw new BadRequestException('Tên shop đã tồn tại, vui lòng chọn tên khác');
    }

    const slug = this.generateSlug(name || 'shop'); // tạo đg dẫn url dễ nhìn từ tên cửa hàng
    return this.prisma.shop.create({
      data: {
        owner_id: userId,
        name,
        slug,
        description: String(data?.description || ''),
        logo_url: data?.logo_url || null,
        status: 'pending',
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
        slug: true,
        description: true,
        logo_url: true,
        rating: true,
        status: true,
        created_at: true,
      },
    });
  }

  async getSellerProductById(userId: number, productId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: { orderBy: { sort_order: 'asc' } },
        variants: { include: { images: true } },
        attribute_values: { include: { attribute: true, attribute_option: true } },
        shop_categories: true
      }
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.shop_id !== shop.id) throw new UnauthorizedException('Not the owner');
    return product;
  }

  // Delete a product
  async deleteProduct(userId: number, productId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.shop_id !== shop.id) throw new UnauthorizedException('Not the owner of this product');

    return this.prisma.product.delete({
      where: { id: productId },
    });
  }

  // =====================
  // INTERNAL ADMIN CONTEXT
  // =====================

  async getAdminStats() {
    const [
      totalShops,
      activeShops,
      pendingApplications,
      totalProducts,
      activeProducts,
      pendingProducts,
      totalCategories,
      activeCategories,
      rootCategories,
    ] = await Promise.all([
      this.prisma.shop.count(),
      this.prisma.shop.count({ where: { status: 'active' } }),
      this.prisma.shop.count({ where: { status: 'pending' } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'active' } }),
      this.prisma.product.count({ where: { status: 'pending_approval' } }),
      this.prisma.category.count({ where: { shop_id: null } }),
      this.prisma.category.count({ where: { shop_id: null, is_active: true } }),
      this.prisma.category.count({ where: { shop_id: null, level: 1 } }),
    ]);

    return {
      totalShops,
      activeShops,
      pendingApplications,
      totalProducts,
      activeProducts,
      pendingProducts,
      totalCategories,
      activeCategories,
      rootCategories,
      maxAttributes: MAX_ATTRIBUTES_PER_CATEGORY,
    };
  }

  async getAdminCategories() {
    return this.prisma.category.findMany({
      where: { shop_id: null },
      orderBy: [{ level: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  async getAdminCategoryById(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        attribute_defs: {
          include: { options: { orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' }
        }
      }
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async createCategory(data: any) {
    const name = this.getValidCategoryName(data.name);
    await this.ensureCategoryNameIsUnique(name, null);

    const slug = data.slug || this.generateSlug(name);
    return this.prisma.category.create({
      data: {
        name,
        slug: slug,
        parent_id: data.parent_id ? Number(data.parent_id) : null,
        icon_url: data.icon_url || null,
        level: data.level ? Number(data.level) : 1,
        sort_order: data.sort_order ? Number(data.sort_order) : 0,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      },
    });
  }

  async updateCategory(id: number, data: any) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, shop_id: true },
    });

    if (!existingCategory || existingCategory.shop_id !== null) {
      throw new NotFoundException('Category not found');
    }

    const name = data.name !== undefined ? this.getValidCategoryName(data.name) : undefined;
    if (name !== undefined) {
      await this.ensureCategoryNameIsUnique(name, null, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name,
        slug: data.slug,
        parent_id: data.parent_id !== undefined ? (data.parent_id ? Number(data.parent_id) : null) : undefined,
        icon_url: data.icon_url,
        level: data.level ? Number(data.level) : undefined,
        sort_order: data.sort_order !== undefined ? Number(data.sort_order) : undefined,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : undefined,
      },
    });
  }

  private async getFallbackCategoryForReassignment(excludedCategoryId: number) {
    const existingFallback = await this.prisma.category.findFirst({
      where: {
        shop_id: null,
        OR: [{ slug: 'khac' }, { name: 'Khác' }],
      },
    });

    if (existingFallback) {
      if (existingFallback.id === excludedCategoryId) {
        throw new BadRequestException('Cannot reassign products because this category is already "Khác"');
      }

      return existingFallback;
    }

    const existingKhacSlug = await this.prisma.category.findFirst({
      where: { slug: 'khac' },
      select: { id: true },
    });

    return this.prisma.category.create({
      data: {
        name: 'Khác',
        slug: existingKhacSlug ? this.generateSlug('Khác') : 'khac',
        parent_id: null,
        level: 1,
        sort_order: 9999,
        is_active: true,
      },
    });
  }

  async getAdminCategoryDeleteImpact(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, shop_id: true },
    });

    if (!category || category.shop_id !== null) {
      throw new NotFoundException('Category not found');
    }

    const childrenCount = await this.prisma.category.count({ where: { parent_id: id } });
    const productCount = await this.prisma.product.count({ where: { category_id: id } });
    const fallbackCategory = await this.prisma.category.findFirst({
      where: {
        shop_id: null,
        OR: [{ slug: 'khac' }, { name: 'Khác' }],
      },
      select: { id: true, name: true },
    });
    const isFallbackCategory = category.slug === 'khac' || category.name === 'Khác' || fallbackCategory?.id === id;

    return {
      productCount,
      childrenCount,
      fallbackCategory: fallbackCategory?.id === id ? null : fallbackCategory,
      canDelete: productCount === 0 && childrenCount === 0,
      canReassignToFallback: productCount > 0 && childrenCount === 0 && !isFallbackCategory,
    };
  }

  async deleteCategory(id: number, options?: { reassignProductsToOther?: boolean }) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, shop_id: true },
    });

    if (!category || category.shop_id !== null) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has children
    const childrenCount = await this.prisma.category.count({ where: { parent_id: id } });
    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete category with sub-categories');
    }

    // Check if category has products
    const productCount = await this.prisma.product.count({ where: { category_id: id } });
    let fallbackCategoryId: number | null = null;
    if (productCount > 0) {
      if (!options?.reassignProductsToOther) {
        throw new BadRequestException('Cannot delete category with assigned products');
      }

      const fallbackCategory = await this.getFallbackCategoryForReassignment(id);
      fallbackCategoryId = fallbackCategory.id;
    }

    return this.prisma.$transaction(async (tx) => {
      if (fallbackCategoryId) {
        await tx.product.updateMany({
          where: { category_id: id },
          data: { category_id: fallbackCategoryId },
        });
      }

      return tx.category.delete({ where: { id } });
    });
  }

  // =====================
  // SELLER CATEGORY CONTEXT (FLAT)
  // =====================

  async getShopCategories(userId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    return this.prisma.category.findMany({
      where: { shop_id: shop.id },
      orderBy: { sort_order: 'asc' }
    });
  }

  async createShopCategory(userId: number, data: any) {
    const shop = await this.requireActiveSellerShop(userId);
    const name = this.getValidCategoryName(data.name);

    // Check limit (max 20 categories per shop)
    const count = await this.prisma.category.count({ where: { shop_id: shop.id } });
    if (count >= 20) {
      throw new BadRequestException('Mỗi cửa hàng chỉ được tạo tối đa 20 danh mục tùy chỉnh');
    }

    await this.ensureCategoryNameIsUnique(name, shop.id);

    const slug = this.generateSlug(name);
    return this.prisma.category.create({
      data: {
        name,
        slug: slug,
        shop_id: shop.id,
        level: 1, // Flat structure
        parent_id: null,
        is_active: true,
        sort_order: data.sort_order || 0
      }
    });
  }

  async updateShopCategory(userId: number, categoryId: number, data: any) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.shop_id !== shop.id) {
      throw new UnauthorizedException('Không có quyền chỉnh sửa danh mục này');
    }

    const name = data.name !== undefined ? this.getValidCategoryName(data.name) : undefined;
    if (name !== undefined) {
      await this.ensureCategoryNameIsUnique(name, shop.id, categoryId);
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name,
        slug: name ? this.generateSlug(name) : undefined,
        sort_order: data.sort_order !== undefined ? data.sort_order : undefined,
        is_active: data.is_active !== undefined ? data.is_active : undefined
      }
    });
  }

  async deleteShopCategory(userId: number, categoryId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.shop_id !== shop.id) {
      throw new UnauthorizedException('Không có quyền xóa danh mục này');
    }

    return this.prisma.category.delete({ where: { id: categoryId } });
  }

  async getCategoryProducts(userId: number, categoryId: number) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { shop_products: { select: { id: true } } }
    });

    if (!category || (category.shop_id !== shop.id && category.shop_id !== null)) {
      throw new UnauthorizedException('Không có quyền truy cập danh mục này');
    }

    const allProducts = await this.prisma.product.findMany({
      where: { shop_id: shop.id },
      include: {
        images: { take: 1 }
      }
    });

    const assignedIds = new Set(category.shop_products.map(p => p.id));

    return allProducts.map(p => {
      const thumbnail_url = p.thumbnail_url || (p.images && p.images[0]?.image_url) || '';
      return {
        id: p.id,
        name: p.name,
        thumbnail_url: thumbnail_url,
        base_price: p.base_price.toString(),
        is_assigned: assignedIds.has(p.id)
      };
    });
  }

  async syncCategoryProducts(userId: number, categoryId: number, productIds: number[]) {
    const shop = await this.requireActiveSellerShop(userId);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });

    if (!category || category.shop_id !== shop.id) {
      throw new UnauthorizedException('Không có quyền chỉnh sửa danh mục này');
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        shop_products: {
          set: productIds.map(id => ({ id: Number(id) }))
        }
      }
    });
  }

  async getAdminCategoryAttributes(categoryId: number) {
    return this.prisma.attributeDefinition.findMany({
      where: { category_id: categoryId },
      include: {
        options: { orderBy: { sort_order: 'asc' } }
      },
      orderBy: { sort_order: 'asc' }
    });
  }

  async createAttributeDefinition(categoryId: number, data: any) {
    const name = this.getValidAttributeName(data.name);
    await this.ensureCategoryAttributeLimitNotExceeded(categoryId);
    await this.ensureAttributeNameIsUnique(categoryId, name);

    return this.prisma.attributeDefinition.create({
      data: {
        category_id: categoryId,
        name,
        input_type: data.input_type || 'dropdown',
        is_required: Boolean(data.is_required),
        sort_order: data.sort_order ? Number(data.sort_order) : 0,
      },
    });
  }

  async updateAttributeDefinition(id: number, data: any) {
    const existingAttribute = await this.prisma.attributeDefinition.findUnique({
      where: { id },
      select: { id: true, category_id: true },
    });

    if (!existingAttribute) {
      throw new NotFoundException('Attribute not found');
    }

    const name = data.name !== undefined ? this.getValidAttributeName(data.name) : undefined;
    if (name !== undefined) {
      await this.ensureAttributeNameIsUnique(existingAttribute.category_id, name, id);
    }

    return this.prisma.attributeDefinition.update({
      where: { id },
      data: {
        name,
        input_type: data.input_type,
        is_required: data.is_required !== undefined ? Boolean(data.is_required) : undefined,
        sort_order: data.sort_order !== undefined ? Number(data.sort_order) : undefined,
      },
    });
  }

  async deleteAttributeDefinition(id: number) {
    return this.prisma.attributeDefinition.delete({ where: { id } });
  }

  async createAttributeOption(attributeId: number, data: any) {
    const valueName = this.getValidAttributeOptionName(data.value_name);
    await this.ensureAttributeOptionNameIsUnique(attributeId, valueName);

    return this.prisma.attributeOption.create({
      data: {
        attribute_id: attributeId,
        value_name: valueName,
        sort_order: data.sort_order ? Number(data.sort_order) : 0,
      },
    });
  }

  async updateAttributeOption(id: number, data: any) {
    const existingOption = await this.prisma.attributeOption.findUnique({
      where: { id },
      select: { id: true, attribute_id: true },
    });

    if (!existingOption) {
      throw new NotFoundException('Attribute option not found');
    }

    const valueName = data.value_name !== undefined ? this.getValidAttributeOptionName(data.value_name) : undefined;
    if (valueName !== undefined) {
      await this.ensureAttributeOptionNameIsUnique(existingOption.attribute_id, valueName, id);
    }

    return this.prisma.attributeOption.update({
      where: { id },
      data: {
        value_name: valueName,
        sort_order: data.sort_order !== undefined ? Number(data.sort_order) : undefined,
      },
    });
  }

  async deleteAttributeOption(id: number) {
    return this.prisma.attributeOption.delete({ where: { id } });
  }

  async getPendingProducts() {
    return this.prisma.product.findMany({
      where: { status: 'pending_approval' },
      include: {
        shop: { select: { name: true } },
        category: { select: { name: true } },
        images: true,
        variants: true,
        attribute_values: {
          include: {
            attribute: { select: { name: true } },
            attribute_option: { select: { value_name: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async approveProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, shop: { select: { owner_id: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        status: 'active',
        moderation_note: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (product.shop?.owner_id) {
      this.sendNotification({
        user_id: product.shop.owner_id,
        title: 'Sản phẩm đã được duyệt',
        message: `Sản phẩm "${product.name}" của bạn đã được kiểm duyệt và hiện đang ở trạng thái hoạt động.`,
        type: 'SYSTEM',
        link: '/seller/products'
      });
    }

    return updated;
  }

  async rejectProduct(id: number, reason: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, shop: { select: { owner_id: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        status: 'rejected',
        moderation_note: reason,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (product.shop?.owner_id) {
      this.sendNotification({
        user_id: product.shop.owner_id,
        title: 'Sản phẩm bị từ chối',
        message: `Sản phẩm "${product.name}" của bạn đã bị từ chối duyệt với lý do: ${reason}. Vui lòng cập nhật lại.`,
        type: 'SYSTEM',
        link: '/seller/products'
      });
    }

    return updated;
  }

  // lấy danh sách các cửa hàng chờ duyệt
  async getPendingShops(search?: string, sortBy?: string) {
    const where: any = { status: 'pending' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { created_at: 'asc' };
    if (sortBy === 'newest') {
      orderBy = { created_at: 'desc' };
    } else if (sortBy === 'name_asc') {
      orderBy = { name: 'asc' };
    } else if (sortBy === 'name_desc') {
      orderBy = { name: 'desc' };
    }

    return this.prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        owner_id: true,
        status: true,
        created_at: true,
      },
      orderBy,
    });
  }

  // duyệt cửa hàng
  async approveShop(id: number) {
    // findUnique -> tìm 1 bản ghi duy nhất theo khóa chính id
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: { id: true, name: true, owner_id: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const updated = await this.prisma.shop.update({
      where: { id },
      data: { status: 'active' },
      select: {
        id: true,
        status: true,
      },
    });

    if (shop.owner_id) {
      this.sendNotification({
        user_id: shop.owner_id,
        title: 'Yêu cầu mở Shop đã được duyệt',
        message: `Chúc mừng! Cửa hàng "${shop.name}" của bạn đã được phê duyệt. Bạn có thể bắt đầu đăng bán các sản phẩm.`,
        type: 'SYSTEM',
        link: '/seller/center'
      });
    }

    return updated;
  }

  async getAllShops(search?: string, status?: string, sortBy?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    let orderBy: any = { created_at: 'desc' };
    if (sortBy === 'oldest') {
      orderBy = { created_at: 'asc' };
    } else if (sortBy === 'name_asc') {
      orderBy = { name: 'asc' };
    } else if (sortBy === 'name_desc') {
      orderBy = { name: 'desc' };
    }

    return this.prisma.shop.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        owner_id: true,
        status: true,
        created_at: true,
        rating: true,
      }
    });
  }

  async updateShopStatus(id: number, status: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');

    const updated = await this.prisma.shop.update({
      where: { id },
      data: { status },
      select: { id: true, status: true }
    });

    if (shop.owner_id) {
      if (status === 'rejected') {
        this.sendNotification({
          user_id: shop.owner_id,
          title: 'Yêu cầu mở Shop bị từ chối',
          message: `Rất tiếc, yêu cầu mở Shop "${shop.name}" của bạn đã bị từ chối. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm thông tin.`,
          type: 'SYSTEM'
        });
      } else if (status === 'suspended') {
        this.sendNotification({
          user_id: shop.owner_id,
          title: 'Cửa hàng đã bị đình chỉ',
          message: `Cửa hàng "${shop.name}" của bạn đã bị quản trị viên đình chỉ hoạt động do vi phạm chính sách hoặc có báo cáo tiêu cực.`,
          type: 'SYSTEM'
        });
      } else if (status === 'banned') {
        this.sendNotification({
          user_id: shop.owner_id,
          title: 'Shop đã bị khoá vĩnh viễn',
          message: `Cửa hàng "${shop.name}" của bạn đã bị khoá vĩnh viễn. Mọi lệnh rút tiền và giao dịch sẽ bị phong toả để đối soát.`,
          type: 'SYSTEM'
        });
      } else if (status === 'active' && shop.status !== 'active') {
        this.sendNotification({
          user_id: shop.owner_id,
          title: 'Cửa hàng đã được kích hoạt',
          message: `Chúc mừng! Cửa hàng "${shop.name}" của bạn đã được kích hoạt trở lại.`,
          type: 'SYSTEM'
        });
      }
    }

    return updated;
  }

  async getShopsByIds(ids: number[]) {
    return this.prisma.shop.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, logo_url: true, slug: true, owner_id: true }
    });
  }

  async getProductsByIds(ids: number[]) {
    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, shop_id: true, status: true }
    });
  }

  async updateProductStatus(id: number, status: string, moderationNote?: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true, shop_id: true } });
    if (!product) throw new Error('Product not found');
    return this.prisma.product.update({
      where: { id },
      data: {
        status,
        ...(moderationNote ? { moderation_note: moderationNote } : {}),
      },
      select: { id: true, status: true, shop_id: true }
    });
  }

  // =====================
  // PUBLIC CONTEXT
  // =====================

  async getPublicShopDetail(shopId: number, userId?: number | null) {
    const shop = await this.requireActiveShop(shopId);

    const [productCount, followerCount, followRecord, products, categories] = await Promise.all([
      this.prisma.product.count({
        where: { shop_id: shop.id, status: 'active' },
      }),
      this.prisma.shopFollow.count({
        where: { shop_id: shop.id },
      }),
      userId
        ? this.prisma.shopFollow.findUnique({
          where: {
            shop_id_user_id: {
              shop_id: shop.id,
              user_id: userId,
            },
          },
          select: { id: true },
        })
        : Promise.resolve(null),
      this.prisma.product.findMany({
        where: { shop_id: shop.id, status: 'active' },
        include: {
          images: { where: { is_primary: true } },
          shop: { select: { name: true, rating: true } },
          variants: true,
          shop_categories: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.category.findMany({
        where: { shop_id: shop.id, is_active: true },
        orderBy: { sort_order: 'asc' }
      })
    ]);

    return {
      ...shop,
      _count: {
        products: productCount,
      },
      follower_count: followerCount,
      is_following: Boolean(followRecord),
      products,
      categories,
    };
  }

  async followShop(userId: number, shopId: number) {
    const shop = await this.requireActiveShop(shopId);

    if (shop.owner_id === userId) {
      throw new BadRequestException('You cannot follow your own shop');
    }

    await this.prisma.shopFollow.upsert({
      where: {
        shop_id_user_id: {
          shop_id: shop.id,
          user_id: userId,
        },
      },
      create: {
        shop_id: shop.id,
        user_id: userId,
      },
      update: {},
    });

    const followerCount = await this.prisma.shopFollow.count({
      where: { shop_id: shop.id },
    });

    // Notify seller about new follower
    try {
      await this.sendNotification({
        user_id: shop.owner_id,
        title: 'Có người theo dõi mới!',
        message: `Shop "${shop.name}" vừa nhận được một người theo dõi mới. Bạn đang có tổng cộng ${followerCount} người theo dõi!`,
        type: 'SYSTEM',
        link: '/seller/center',
      });
    } catch (e) { }

    return {
      shop_id: shop.id,
      is_following: true,
      follower_count: followerCount,
    };
  }

  async unfollowShop(userId: number, shopId: number) {
    const shop = await this.requireActiveShop(shopId);

    await this.prisma.shopFollow.deleteMany({
      where: {
        shop_id: shop.id,
        user_id: userId,
      },
    });

    const followerCount = await this.prisma.shopFollow.count({
      where: { shop_id: shop.id },
    });

    return {
      shop_id: shop.id,
      is_following: false,
      follower_count: followerCount,
    };
  }

  async getFollowedShops(userId: number) {
    const follows = await this.prisma.shopFollow.findMany({
      where: {
        user_id: userId,
        shop: {
          is: {
            status: 'active',
          },
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            owner_id: true,
            name: true,
            slug: true,
            description: true,
            logo_url: true,
            rating: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const shopIds = follows.map((follow) => follow.shop_id);
    const [productCounts, followerCounts] = await Promise.all([
      shopIds.length
        ? this.prisma.product.groupBy({
          by: ['shop_id'],
          where: {
            shop_id: { in: shopIds },
            status: 'active',
          },
          _count: {
            _all: true,
          },
        })
        : Promise.resolve([]),
      shopIds.length
        ? this.prisma.shopFollow.groupBy({
          by: ['shop_id'],
          where: {
            shop_id: { in: shopIds },
          },
          _count: {
            _all: true,
          },
        })
        : Promise.resolve([]),
    ]);

    const productCountByShopId = new Map(
      productCounts.map((entry) => [entry.shop_id, entry._count._all]),
    );
    const followerCountByShopId = new Map(
      followerCounts.map((entry) => [entry.shop_id, entry._count._all]),
    );

    return follows.map((follow) => ({
      ...follow.shop,
      followed_at: follow.created_at,
      follower_count: followerCountByShopId.get(follow.shop_id) ?? 0,
      is_following: true,
      _count: {
        products: productCountByShopId.get(follow.shop_id) ?? 0,
      },
    }));
  }

  // Homepage / Discovery: List all 'active' products
  async getActiveProducts(searchQuery?: string, categorySlug?: string) {
    const where: any = {
      status: 'active',
      shop: { status: 'active' },
      variants: {
        some: {
          stock_quantity: { gt: 0 },
        },
      },
    };

    if (categorySlug && categorySlug.trim() !== '') {
      const category = await this.prisma.category.findFirst({
        where: {
          slug: categorySlug.trim(),
          is_active: true,
          shop_id: null, // Global discovery only for platform categories
        },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const categoryIds = await this.getCategoryDescendantIds(category.id);
      where.category_id = { in: categoryIds };
    }
    if (searchQuery && searchQuery.trim() !== '') {
      where.name = { contains: searchQuery.trim(), mode: 'insensitive' };
    }

    return this.prisma.product.findMany({
      where,
      include: {
        shop: { select: { name: true, logo_url: true, rating: true, id: true } },
        images: { where: { is_primary: true } },
        variants: true
      },
      orderBy: { created_at: 'desc' },
      take: 40
    });
  }

  // Get single product details
  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shop: {
          include: {
            _count: {
              select: { products: { where: { status: 'active' } } }
            }
          }
        },
        category: true,
        images: true,
        variants: true,
        attribute_values: { include: { attribute: true, attribute_option: true } }
      }
    });
    if (!product || product.status !== 'active' || product.shop.status !== 'active') {
      throw new NotFoundException('Product not available or shop is suspended');
    }

    await this.prisma.product.update({
      where: { id },
      data: { view_count: { increment: 1 } }
    });
    product.view_count = (product.view_count || 0) + 1;

    return product;
  }

  // =====================
  // PUBLIC SHOP STOREFRONT
  // =====================

  async getPublicShopById(shopId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo_url: true,
        rating: true,
        owner_id: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            products: { where: { status: 'active' } },
          },
        },
      },
    });

    if (!shop || shop.status !== 'active') {
      throw new NotFoundException('Shop not available');
    }

    return shop;
  }

  async getPublicShopProducts(shopId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, status: true },
    });

    if (!shop || shop.status !== 'active') {
      throw new NotFoundException('Shop not available');
    }

    return this.prisma.product.findMany({
      where: {
        shop_id: shopId,
        status: 'active',
        variants: {
          some: {
            stock_quantity: { gt: 0 },
          },
        },
      },
      select: {
        id: true,
        shop_id: true,
        name: true,
        thumbnail_url: true,
        base_price: true,
        rating: true,
        sold_count: true,
        created_at: true,
        category: { select: { name: true } },
        images: { where: { is_primary: true }, select: { image_url: true, is_primary: true } },
        variants: { select: { id: true, price_override: true, stock_quantity: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 60,
    });
  }

  async getShopFollowers(shopId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, status: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const followers = await this.prisma.shopFollow.findMany({
      where: { shop_id: shopId },
      select: { user_id: true, created_at: true },
      orderBy: { created_at: 'desc' }
    });

    if (followers.length === 0) return [];

    const userIds = followers.map(f => f.user_id);
    const authUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3002/api/auth';
    try {
      const res = await fetch(`${authUrl}/internal/admin/users-by-ids?ids=${userIds.join(',')}`, {
        headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token' }
      });
      if (res.ok) {
        const users = await res.json();
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        return followers.map(f => ({
          user_id: f.user_id,
          created_at: f.created_at,
          user: userMap.get(f.user_id) || null
        }));
      }
    } catch (e) {
      console.error('Failed to fetch followers user details:', e);
    }
    
    return followers;
  }

  // =====================
  // TAXONOMY (Categories & Attributes)
  // =====================

  async getCategories() {
    return this.prisma.category.findMany({
      where: { is_active: true, shop_id: null },
      orderBy: [{ level: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }]
    });
  }

  async getCategoryAttributes(categoryId: number) {
    const categoryIds = await this.getCategoryLineageIds(categoryId);
    if (categoryIds.length === 0) {
      return [];
    }

    const categoryOrder = new Map(categoryIds.map((id, index) => [id, index]));
    const attributes = await this.prisma.attributeDefinition.findMany({
      where: {
        category_id: { in: categoryIds },
      },
      include: {
        options: { orderBy: { sort_order: 'asc' } }
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ]
    });

    return attributes.sort((left, right) => {
      const leftCategoryOrder = categoryOrder.get(left.category_id) ?? Number.MAX_SAFE_INTEGER;
      const rightCategoryOrder = categoryOrder.get(right.category_id) ?? Number.MAX_SAFE_INTEGER;

      if (leftCategoryOrder !== rightCategoryOrder) {
        return leftCategoryOrder - rightCategoryOrder;
      }

      const leftSortOrder = left.sort_order ?? 0;
      const rightSortOrder = right.sort_order ?? 0;
      if (leftSortOrder !== rightSortOrder) {
        return leftSortOrder - rightSortOrder;
      }

      return left.name.localeCompare(right.name);
    });
  }

  // =====================
  // REVIEWS
  // =====================

  async getProductReviews(productId: number, page = 1, limit = 10) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true, status: true } });
    if (!product) throw new NotFoundException('Product not found');

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { product_id: productId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { product_id: productId } }),
    ]);

    const userMap = await this.getUsersByIds(reviews.map((review) => review.user_id));
    const reviewsWithUsers = reviews.map((review) => ({
      ...review,
      user: userMap.get(review.user_id) ?? null,
    }));

    // Rating distribution
    const distribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { product_id: productId },
      _count: { id: true },
    });

    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach(d => { ratingDist[d.rating] = d._count.id; });

    const avg = total > 0
      ? distribution.reduce((sum, d) => sum + d.rating * d._count.id, 0) / total
      : 0;

    return {
      reviews: reviewsWithUsers,
      total,
      page,
      limit,
      avg_rating: Math.round(avg * 10) / 10,
      rating_distribution: ratingDist,
    };
  }

  async createReview(userId: number, productId: number, data: { rating: number; comment?: string; media_urls?: string[]; shop_order_id: number }) {
    if (!productId || isNaN(productId)) {
      throw new BadRequestException('Invalid product ID');
    }
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true, shop_id: true } });
    if (!product) throw new NotFoundException('Product not found');

    // 1. Cross-service integrity check (Order verification)
    try {
      const orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004/api/orders';
      const res = await fetch(`${orderUrl}/${data.shop_order_id}`);
      if (res.ok) {
        const orderData = await res.json();
        const checkoutSession = orderData.checkout_session;
        if (!checkoutSession || checkoutSession.user_id !== userId) {
          throw new ForbiddenException('Bạn không phải chủ nhân của đơn hàng này');
        }
        if (orderData.status?.toLowerCase() !== 'delivered') {
          throw new BadRequestException('Bạn chỉ được đánh giá các đơn hàng đã được giao thành công');
        }
      }
    } catch (err: any) {
      if (err instanceof ForbiddenException || err instanceof BadRequestException) throw err;
      console.error('[ProductService] Lỗi kết nối liên dịch vụ (OrderService):', err.message);
    }

    if (!data.rating || data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check duplicate
    const existing = await this.prisma.review.findUnique({
      where: {
        user_id_product_id_shop_order_id: {
          user_id: userId,
          product_id: productId,
          shop_order_id: data.shop_order_id,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi');
    }

    const review = await this.prisma.review.create({
      data: {
        user_id: userId,
        product_id: productId,
        shop_order_id: data.shop_order_id,
        rating: data.rating,
        comment: data.comment || null,
        media_urls: data.media_urls || [],
      },
    });

    // Recalculate product rating
    const agg = await this.prisma.review.aggregate({
      where: { product_id: productId },
      _avg: { rating: true },
    });
    const newRating = Math.round((agg._avg.rating || 0) * 100) / 100;
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: newRating },
    });

    // Recalculate shop rating (Trung bình của tất cả review sản phẩm trong Shop)
    const allShopReviews = await this.prisma.review.aggregate({
      where: { product: { shop_id: product.shop_id } },
      _count: { id: true },
      _avg: { rating: true },
    });

    if (allShopReviews._count.id > 0) {
      await this.prisma.shop.update({
        where: { id: product.shop_id },
        data: { rating: Math.round((allShopReviews._avg.rating || 0) * 100) / 100 },
      });
    }

    return review;
  }

  async getShopReviews(userId: number, filters?: { rating?: number; status?: string }) {
    const shop = await this.requireActiveSellerShop(userId);
    const where: any = { product: { shop_id: shop.id } };

    if (filters?.rating) {
      where.rating = filters.rating;
    }
    if (filters?.status === 'replied') {
      where.seller_reply = { not: null };
    } else if (filters?.status === 'unreplied') {
      where.seller_reply = null;
    }

    return this.prisma.review.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, thumbnail_url: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getMyReviews(userId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { user_id: userId },
      select: { id: true, shop_order_id: true, product_id: true, rating: true, comment: true, media_urls: true }
    });
    return reviews;
  }
  async replyToReview(userId: number, reviewId: number, reply: string) {
    const shop = await this.requireActiveSellerShop(userId);
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { shop_id: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.product.shop_id !== shop.id) {
      throw new BadRequestException('Bạn không có quyền phản hồi đánh giá này');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        seller_reply: reply,
        replied_at: new Date(),
      },
    });
  }

  async updateReview(userId: number, reviewId: number, data: { rating?: number; comment?: string; media_urls?: string[] }) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId }, include: { product: true } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.user_id !== userId) throw new ForbiddenException('Bạn không có quyền sửa đánh giá này');

    if (data.rating && (data.rating < 1 || data.rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: data.rating ?? review.rating,
        comment: data.comment !== undefined ? data.comment : review.comment,
        media_urls: data.media_urls !== undefined ? data.media_urls : review.media_urls,
      },
    });

    if (data.rating && data.rating !== review.rating) {
      // Recalculate product rating
      const agg = await this.prisma.review.aggregate({
        where: { product_id: review.product_id },
        _avg: { rating: true },
      });
      const newRating = Math.round((agg._avg.rating || 0) * 100) / 100;
      await this.prisma.product.update({
        where: { id: review.product_id },
        data: { rating: newRating },
      });

      // Recalculate shop rating
      const allShopReviews = await this.prisma.review.aggregate({
        where: { product: { shop_id: review.product.shop_id } },
        _count: { id: true },
        _avg: { rating: true },
      });
      if (allShopReviews._count.id > 0) {
        await this.prisma.shop.update({
          where: { id: review.product.shop_id },
          data: { rating: Math.round((allShopReviews._avg.rating || 0) * 100) / 100 },
        });
      }
    }
    return updated;
  }

  async deleteReview(userId: number, reviewId: number) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId }, include: { product: true } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.user_id !== userId) throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');

    await this.prisma.review.delete({ where: { id: reviewId } });

    // Recalculate product rating
    const agg = await this.prisma.review.aggregate({
      where: { product_id: review.product_id },
      _avg: { rating: true },
    });
    const newRating = Math.round((agg._avg.rating || 0) * 100) / 100;
    await this.prisma.product.update({
      where: { id: review.product_id },
      data: { rating: newRating },
    });

    // Recalculate shop rating
    const allShopReviews = await this.prisma.review.aggregate({
      where: { product: { shop_id: review.product.shop_id } },
      _count: { id: true },
      _avg: { rating: true },
    });
    const shopAvg = allShopReviews._count.id > 0 ? (allShopReviews._avg.rating || 0) : 0;
    await this.prisma.shop.update({
      where: { id: review.product.shop_id },
      data: { rating: Math.round(shopAvg * 100) / 100 },
    });

    return { success: true };
  }
}

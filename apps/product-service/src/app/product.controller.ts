import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UnauthorizedException, Inject, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(@Inject(ProductService) private readonly productService: ProductService) { }

  // Seller context is derived from the authenticated user id in product-service.
  private getProviderUserId(headers: any): number {
    const userId = headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing x-user-id header for Seller context');
    return parseInt(userId, 10);
  }

  private getOptionalProviderUserId(headers: any): number | null {
    const userId = headers['x-user-id'];
    if (!userId) return null;
    const parsed = parseInt(Array.isArray(userId) ? userId[0] : userId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private requireInternalAccess(headers: Record<string, string | string[] | undefined>) {
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
    const actualToken = headers['x-internal-token'];
    const normalizedToken = Array.isArray(actualToken) ? actualToken[0] : actualToken;
    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  // --- FILE UPLOAD ---

  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // Interceptor này sử dụng thư viện Multer để xử lý luồng dữ liệu (stream) tệp tin. -> tên "file" trong ngoặc phải khớp với ở fe
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
    const uploadPath = `/uploads/products/${file.filename}`;
    const url = publicBaseUrl ? `${publicBaseUrl}${uploadPath}` : uploadPath;
    return { url };
  }

  // --- SELLER ROUTES ---

  @Get('seller/metrics')
  getSellerMetrics(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getSellerMetrics(userId);
  }

  @Post('seller')
  createProduct(@Headers() headers: any, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.createProduct(userId, data);
  }

  @Post('seller/register')
  registerShop(@Headers() headers: any, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.registerShop(userId, data);
  }

  @Get('seller')
  getMyShopProducts(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getShopProducts(userId);
  }

  @Put('seller/shop')
  updateShop(@Headers() headers: any, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.updateShop(userId, data);
  }

  @Delete('seller/shop')
  deleteShop(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.deleteShop(userId);
  }

  @Get('seller/context')
  getSellerContext(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getSellerContext(userId);
  }

  @Post('shop/:shopId/follow')
  followShop(@Headers() headers: any, @Param('shopId') shopId: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.followShop(userId, +shopId);
  }

  @Delete('shop/:shopId/follow')
  unfollowShop(@Headers() headers: any, @Param('shopId') shopId: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.unfollowShop(userId, +shopId);
  }

  @Get('following')
  getFollowingShops(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getFollowedShops(userId);
  }

  // --- SELLER CATEGORY ROUTES ---

  @Get('seller/categories')
  getShopCategories(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getShopCategories(userId);
  }

  @Post('seller/categories')
  createShopCategory(@Headers() headers: any, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.createShopCategory(userId, data);
  }

  @Put('seller/categories/:id')
  updateShopCategory(@Headers() headers: any, @Param('id') id: string, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.updateShopCategory(userId, +id, data);
  }

  @Delete('seller/categories/:id')
  deleteShopCategory(@Headers() headers: any, @Param('id') id: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.deleteShopCategory(userId, +id);
  }

  @Get('seller/categories/:id/products')
  getCategoryProducts(@Headers() headers: any, @Param('id') id: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getCategoryProducts(userId, +id);
  }

  @Post('seller/categories/:id/products')
  syncCategoryProducts(@Headers() headers: any, @Param('id') id: string, @Body() body: { productIds: number[] }) {
    const userId = this.getProviderUserId(headers);
    return this.productService.syncCategoryProducts(userId, +id, body.productIds);
  }


  @Get('seller/analytics')
  getSellerAnalytics(@Headers() headers: any, @Query('days') days?: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getSellerAnalytics(userId, days ? +days : 10);
  }

  // --- SELLER REVIEW ROUTES ---

  @Get('seller/reviews')
  getShopReviews(
    @Headers() headers: any,
    @Query('rating') rating?: string,
    @Query('status') status?: string,
  ) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getShopReviews(userId, {
      rating: rating ? parseInt(rating) : undefined,
      status
    });
  }

  @Post('seller/reviews/:id/reply')
  replyToReview(@Headers() headers: any, @Param('id') id: string, @Body('reply') reply: string) {
    const userId = this.getProviderUserId(headers);
    return this.productService.replyToReview(userId, +id, reply);
  }

  @Get('seller/:id')
  getSellerProductDetail(@Headers() headers: any, @Param('id') id: string) {
    const userId = this.getProviderUserId(headers);
    const productId = parseInt(id, 10);
    if (isNaN(productId)) throw new BadRequestException('Invalid product ID');
    return this.productService.getSellerProductById(userId, productId);
  }

  @Put('seller/:id')
  updateProduct(@Headers() headers: any, @Param('id') id: string, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    const productId = parseInt(id, 10);
    if (isNaN(productId)) throw new BadRequestException('Invalid product ID');
    return this.productService.updateProduct(userId, productId, data);
  }

  @Delete('seller/:id')
  deleteProduct(@Headers() headers: any, @Param('id') id: string) {
    const userId = this.getProviderUserId(headers);
    const productId = parseInt(id, 10);
    if (isNaN(productId)) throw new BadRequestException('Invalid product ID');
    return this.productService.deleteProduct(userId, productId);
  }

  // --- INTERNAL ADMIN ROUTES ---

  @Get('internal/admin/stats')
  getAdminStats(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.productService.getAdminStats();
  }

  @Get('internal/admin/pending-shops')
  getPendingShops(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.getPendingShops(search, sortBy);
  }

  @Put('internal/admin/shops/:id/approve')
  approveShop(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.approveShop(+id);
  }

  @Get('internal/admin/shops')
  getAllShops(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.getAllShops(search, status, sortBy);
  }

  @Put('internal/admin/shops/:id/status')
  updateShopStatus(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.updateShopStatus(+id, status);
  }

  @Get('internal/admin/shops-by-ids')
  getShopsByIds(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('ids') ids: string,
  ) {
    this.requireInternalAccess(headers);
    if (!ids) return [];
    const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    return this.productService.getShopsByIds(idArray);
  }

  @Get('internal/admin/products-by-ids')
  getProductsByIds(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('ids') ids: string,
  ) {
    this.requireInternalAccess(headers);
    if (!ids) return [];
    const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    return this.productService.getProductsByIds(idArray);
  }

  @Put('internal/admin/products/:id/status')
  updateProductStatus(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('moderation_note') moderationNote?: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.updateProductStatus(+id, status, moderationNote);
  }

  // --- CATEGORY MANAGEMENT ---

  @Get('internal/admin/categories')
  getAdminCategories(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.productService.getAdminCategories();
  }

  @Get('internal/admin/categories/:id')
  getAdminCategoryById(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.getAdminCategoryById(+id);
  }

  @Post('internal/admin/categories')
  createCategory(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() data: any,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.createCategory(data);
  }

  @Put('internal/admin/categories/:id')
  updateCategory(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.updateCategory(+id, data);
  }

  @Get('internal/admin/categories/:id/delete-impact')
  getAdminCategoryDeleteImpact(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.getAdminCategoryDeleteImpact(+id);
  }

  @Delete('internal/admin/categories/:id')
  deleteCategory(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.deleteCategory(+id, data);
  }

  // --- ATTRIBUTE MANAGEMENT ---

  @Get('internal/admin/categories/:id/attributes')
  getAdminCategoryAttributes(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.getAdminCategoryAttributes(+id);
  }

  @Post('internal/admin/categories/:categoryId/attributes')
  createAttributeDefinition(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('categoryId') categoryId: string,
    @Body() data: any,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.createAttributeDefinition(+categoryId, data);
  }

  @Put('internal/admin/attributes/:id')
  updateAttributeDefinition(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.updateAttributeDefinition(+id, data);
  }

  @Delete('internal/admin/attributes/:id')
  deleteAttributeDefinition(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.deleteAttributeDefinition(+id);
  }

  @Post('internal/admin/attributes/:attributeId/options')
  createAttributeOption(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('attributeId') attributeId: string,
    @Body() data: any,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.createAttributeOption(+attributeId, data);
  }

  @Put('internal/admin/attribute-options/:id')
  updateAttributeOption(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.updateAttributeOption(+id, data);
  }

  @Delete('internal/admin/attribute-options/:id')
  deleteAttributeOption(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.deleteAttributeOption(+id);
  }
  @Get('internal/admin/pending-products')
  getPendingProducts(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.productService.getPendingProducts();
  }

  @Put('internal/admin/products/:id/approve')
  approveProduct(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.approveProduct(+id);
  }

  @Put('internal/admin/products/:id/reject')
  rejectProduct(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    this.requireInternalAccess(headers);
    return this.productService.rejectProduct(+id, reason);
  }

  // --- PUBLIC ROUTES (TAXONOMY MUST BE BEFORE :id) ---

  // --- PUBLIC SHOP STOREFRONT ---

  @Get('shops/:id')
  getPublicShop(@Param('id') id: string) {
    return this.productService.getPublicShopById(+id);
  }

  @Get('shops/:id/products')
  getPublicShopProducts(@Param('id') id: string) {
    return this.productService.getPublicShopProducts(+id);
  }

  @Get('shops/:id/followers')
  getShopFollowers(@Param('id') id: string) {
    return this.productService.getShopFollowers(+id);
  }

  @Get('shop/:shopId')
  getShopDetail(@Headers() headers: any, @Param('shopId') shopId: string) {
    return this.productService.getPublicShopDetail(+shopId, this.getOptionalProviderUserId(headers));
  }

  @Get('categories/all')
  getCategories() {
    return this.productService.getCategories();
  }

  @Get('categories/:id/attributes')
  getCategoryAttributes(@Param('id') id: string) {
    return this.productService.getCategoryAttributes(+id);
  }

  @Get()
  getAllActiveProducts(
    @Query('q') query?: string,
    @Query('categorySlug') categorySlug?: string,
  ) {
    return this.productService.getActiveProducts(query, categorySlug);
  }

  // --- PUBLIC REVIEW ROUTES (must be before :id catch-all) ---

  @Get('reviews/me')
  getMyReviews(@Headers() headers: any) {
    const userId = this.getProviderUserId(headers);
    return this.productService.getMyReviews(userId);
  }

  @Get(':id/reviews')
  getProductReviews(@Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.productService.getProductReviews(+id, page ? +page : 1, limit ? +limit : 10);
  }

  @Post(':id/reviews')
  createReview(@Headers() headers: any, @Param('id') id: string, @Body() data: any) {
    const userId = this.getProviderUserId(headers);
    const productId = parseInt(id, 10);
    if (isNaN(productId)) throw new BadRequestException('Invalid product ID');
    return this.productService.createReview(userId, productId, data);
  }

  @Put(':id/reviews/:reviewId')
  updateReview(
    @Headers() headers: any,
    @Param('reviewId') reviewId: string,
    @Body() data: { rating?: number; comment?: string; media_urls?: string[] }
  ) {
    const userId = this.getProviderUserId(headers);
    return this.productService.updateReview(userId, +reviewId, data);
  }

  @Delete(':id/reviews/:reviewId')
  deleteReview(
    @Headers() headers: any,
    @Param('reviewId') reviewId: string
  ) {
    const userId = this.getProviderUserId(headers);
    return this.productService.deleteReview(userId, +reviewId);
  }

  @Get(':id')
  getProductDetail(@Param('id') id: string) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) throw new BadRequestException('Invalid product ID');
    return this.productService.getProductById(productId);
  }
}

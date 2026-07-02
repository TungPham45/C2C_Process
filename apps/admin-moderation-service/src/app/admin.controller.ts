import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './roles.guard';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('dashboard')
  getAdminStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query() query: any) {
    return this.adminService.getUsers(query);
  }

  @Put('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateUserStatus(+id, status);
  }

  @Get('analytics/user-growth')
  getUserGrowthAnalytics(@Query('timeframe') timeframe: string) {
    return this.adminService.getUserGrowthAnalytics(timeframe);
  }

  @Get('analytics/shop-sales')
  getShopSalesAnalytics(@Query('timeframe') timeframe: string) {
    return this.adminService.getShopSalesAnalytics(timeframe);
  }

  @Get('applications')
  getPendingShops(@Query() query: any) {
    return this.adminService.getPendingShops(query);
  }

  @Put('applications/:id/approve')
  approveShop(@Param('id') id: string) {
    return this.adminService.approveShop(+id);
  }

  @Get('shops')
  getShops(@Query() query: any) {
    return this.adminService.getShops(query);
  }

  @Put('shops/:id/status')
  updateShopStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateShopStatus(+id, status);
  }

  @Get('products/pending')
  getPendingProducts() {
    return this.adminService.getPendingProducts();
  }

  @Put('products/:id/approve')
  approveProduct(@Param('id') id: string) {
    return this.adminService.approveProduct(+id);
  }

  @Put('products/:id/reject')
  rejectProduct(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectProduct(+id, reason);
  }

  // --- LOCATIONS ---

  @Get('locations/summary')
  getLocationSummary() {
    return this.adminService.getLocationSummary();
  }

  @Get('locations')
  getLocations(@Query() query: any) {
    return this.adminService.getLocations(query);
  }

  @Get('locations/options')
  getLocationOptions() {
    return this.adminService.getLocationOptions();
  }

  @Post('locations')
  createLocation(@Body() data: any) {
    return this.adminService.createLocation(data);
  }

  @Put('locations/:level/:id')
  updateLocation(@Param('level') level: string, @Param('id') id: string, @Body() data: any) {
    return this.adminService.updateLocation(level, +id, data);
  }

  @Put('locations/:level/:id/status')
  updateLocationStatus(@Param('level') level: string, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.updateLocationStatus(level, +id, isActive);
  }

  @Delete('locations/:level/:id')
  deleteLocation(@Param('level') level: string, @Param('id') id: string) {
    return this.adminService.deleteLocation(level, +id);
  }

  // --- CATEGORIES ---

  @Get('categories')
  getCategories() {
    return this.adminService.getCategories();
  }

  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return this.adminService.getCategoryById(+id);
  }

  @Post('categories')
  createCategory(@Body() data: any) {
    return this.adminService.createCategory(data);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateCategory(+id, data);
  }

  @Get('categories/:id/delete-impact')
  getCategoryDeleteImpact(@Param('id') id: string) {
    return this.adminService.getCategoryDeleteImpact(+id);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string, @Body() data: any) {
    return this.adminService.deleteCategory(+id, data);
  }

  // --- ATTRIBUTES ---

  @Get('categories/:id/attributes')
  getCategoryAttributes(@Param('id') id: string) {
    return this.adminService.getCategoryAttributes(+id);
  }

  @Post('categories/:id/attributes')
  createAttribute(@Param('id') id: string, @Body() data: any) {
    return this.adminService.createAttribute(+id, data);
  }

  @Put('attributes/:id')
  updateAttribute(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateAttribute(+id, data);
  }

  @Delete('attributes/:id')
  deleteAttribute(@Param('id') id: string) {
    return this.adminService.deleteAttribute(+id);
  }

  @Post('attributes/:id/options')
  createAttributeOption(@Param('id') id: string, @Body() data: any) {
    return this.adminService.createAttributeOption(+id, data);
  }

  @Put('attribute-options/:id')
  updateAttributeOption(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateAttributeOption(+id, data);
  }

  @Delete('attribute-options/:id')
  deleteAttributeOption(@Param('id') id: string) {
    return this.adminService.deleteAttributeOption(+id);
  }

  // --- Banners ---

  @Get('public/banners')
  getActiveBanners() {
    return this.adminService.getActiveBanners();
  }

  @Get('banners')
  getAllBanners() {
    return this.adminService.getAllBanners();
  }

  @Post('banners')
  createBanner(@Body() body: any) {
    return this.adminService.createBanner(body);
  }

  @Put('banners/:id')
  updateBanner(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateBanner(+id, body);
  }

  @Delete('banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(+id);
  }

  // --- VOUCHERS ---

  @Get('vouchers')
  getAllVouchers() {
    return this.adminService.getAllVouchers();
  }

  @Get('vouchers/:id')
  getVoucherById(@Param('id') id: string) {
    return this.adminService.getVoucherById(+id);
  }

  @Delete('vouchers/:id')
  deleteVoucher(@Param('id') id: string) {
    return this.adminService.deleteVoucher(+id);
  }

  // --- WALLETS & TRANSACTIONS ---

  @Get('wallets/stats')
  getWalletStats() {
    return this.adminService.getWalletStats();
  }

  @Get('wallets')
  getAllWallets(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getAllWallets(page, limit);
  }

  @Get('wallets/:userId')
  getWalletByUserId(@Param('userId') userId: string) {
    return this.adminService.getWalletByUserId(+userId);
  }

  @Get('transactions')
  getAllTransactions(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllTransactions(type, status, userId, page, limit);
  }

  @Get('transactions/:id')
  getTransactionById(@Param('id') id: string) {
    return this.adminService.getTransactionById(+id);
  }

  @Put('transactions/:id/status')
  updateTransactionStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateTransactionStatus(+id, status);
  }

  // --- SELLER PAYOUTS ---

  @Get('payouts')
  getPayouts(@Query('status') status?: string, @Query('shopId') shopId?: string) {
    return this.adminService.getPayouts(status, shopId);
  }

  @Post('payouts/process-eligible')
  processEligiblePayouts() {
    return this.adminService.processEligiblePayouts();
  }

  @Post('payouts/:id/release')
  releasePayout(@Param('id') id: string) {
    return this.adminService.releasePayout(+id);
  }
}

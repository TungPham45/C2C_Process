import { Controller, Get, Post, Put, Delete, Param, Body, Headers, ForbiddenException, Req, UnauthorizedException, Query } from '@nestjs/common';
import { VoucherService } from './voucher.service';

@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  private requireInternalAccess(headers: Record<string, string | string[] | undefined>) {
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
    const actualToken = headers['x-internal-token'];
    const normalizedToken = Array.isArray(actualToken) ? actualToken[0] : actualToken;
    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  private getProviderUserId(headers: Record<string, string | string[] | undefined>) {
    const userId = headers['x-user-id'];
    const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
    if (!normalizedUserId) {
      throw new UnauthorizedException('Missing x-user-id header for seller context');
    }

    return parseInt(normalizedUserId, 10);
  }

  @Get('internal/admin')
  async getAllVouchers(@Headers() headers: any) {
    this.requireInternalAccess(headers);
    return this.voucherService.getAllVouchers();
  }

  @Get('internal/admin/stats')
  async getAdminStats(@Headers() headers: any) {
    this.requireInternalAccess(headers);
    return this.voucherService.getAdminStats();
  }

  @Get('internal/admin/:id')
  async getVoucherById(@Param('id') id: string, @Headers() headers: any) {
    this.requireInternalAccess(headers);
    return this.voucherService.getVoucherStats(+id);
  }

  @Delete('internal/admin/:id')
  async deleteVoucher(@Param('id') id: string, @Headers() headers: any) {
    this.requireInternalAccess(headers);
    return this.voucherService.deleteVoucher(+id);
  }

  @Get('seller')
  async getSellerVouchers(@Headers() headers: Record<string, string | string[] | undefined>) {
    const userId = this.getProviderUserId(headers);
    return this.voucherService.getSellerVouchers(userId);
  }

  @Get('seller/:id')
  async getSellerVoucherById(
    @Param('id') id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const userId = this.getProviderUserId(headers);
    return this.voucherService.getSellerVoucherById(userId, +id);
  }

  @Post('seller')
  async createSellerVoucher(
    @Body() data: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const userId = this.getProviderUserId(headers);
    return this.voucherService.createSellerVoucher(userId, data);
  }

  @Put('seller/:id')
  async updateSellerVoucher(
    @Param('id') id: string,
    @Body() data: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const userId = this.getProviderUserId(headers);
    return this.voucherService.updateSellerVoucher(userId, +id, data);
  }

  @Delete('seller/:id')
  async deleteSellerVoucher(
    @Param('id') id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const userId = this.getProviderUserId(headers);
    return this.voucherService.deleteSellerVoucher(userId, +id);
  }

  // --- User Routes ---

  @Get('available')
  async getAvailableVouchers(@Req() req: any, @Query('only_active') onlyActive?: string) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.voucherService.getAvailableVouchers(parseInt(userId), onlyActive === 'true');
  }

  @Get('mine')
  async getMyVouchers(@Req() req: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.voucherService.getMyVouchers(parseInt(userId));
  }

  @Post(':id/claim')
  async claimVoucher(@Param('id') id: string, @Req() req: any) {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.voucherService.claimVoucher(parseInt(userId), parseInt(id));
  }
}

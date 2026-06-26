import { Controller, Post, Body, UnauthorizedException, Inject, Get, Headers, ForbiddenException, Put, Param, Query, Req, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) { }

  private requireInternalAccess(headers: Record<string, string | string[] | undefined>) {
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
    const actualToken = headers['x-internal-token'];
    const normalizedToken = Array.isArray(actualToken) ? actualToken[0] : actualToken;
    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  private getUserIdFromReq(req: any): number {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }
    if (user.status === 'suspended' || user.status === 'banned') {
      throw new ForbiddenException('Tài khoản của bạn đã bị đình chỉ hoặc khoá. Vui lòng liên hệ bộ phận hỗ trợ.');
    }
    if (user.status === 'pending') {
      throw new ForbiddenException('Tài khoản chưa được xác thực. Vui lòng xác thực mã OTP gửi qua Email trước khi đăng nhập.');
    }
    return this.authService.login(user);
  }

  @Get('debug/latest-otp')
  async getLatestOtpForTest(@Query('email') email: string) {
    return this.authService.getLatestOtpForEmail(email);
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestForgotPassword(email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; code: string; purpose: string }) {
    return this.authService.verifyOtp(body.email, body.code, body.purpose);
  }

  @Post('resend-otp')
  async resendOtp(@Body() body: { email: string; purpose: string }) {
    return this.authService.resendOtp(body.email, body.purpose);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = this.getUserIdFromReq(req);
    return this.authService.getProfile(userId);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = this.getUserIdFromReq(req);
    return this.authService.updateProfile(userId, body);
  }

  @Get('addresses')
  async getAddresses(@Req() req: any) {
    const userId = this.getUserIdFromReq(req);
    return this.authService.getAddresses(userId);
  }

  @Post('addresses')
  async createAddress(@Req() req: any, @Body() body: any) {
    const userId = this.getUserIdFromReq(req);
    return this.authService.createAddress(userId, body);
  }

  @Put('addresses/:id')
  async updateAddress(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = this.getUserIdFromReq(req);
    return this.authService.updateAddress(userId, +id, body);
  }

  @Put('addresses/:id/default')
  async setDefaultAddress(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserIdFromReq(req);
    return this.authService.setDefaultAddress(userId, +id);
  }

  @Delete('addresses/:id')
  async deleteAddress(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserIdFromReq(req);
    return this.authService.deleteAddress(userId, +id);
  }

  @Get('internal/admin/stats')
  getAdminStats(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.requireInternalAccess(headers);
    return this.authService.getAdminStats();
  }

  @Get('internal/admin/users')
  getAllUsers(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    this.requireInternalAccess(headers);
    return this.authService.getAllUsers(search, status, sortBy);
  }

  @Put('internal/admin/users/:id/status')
  updateUserStatus(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    this.requireInternalAccess(headers);
    return this.authService.updateUserStatus(+id, status);
  }

  @Get('internal/admin/analytics/user-growth')
  getUserGrowthAnalytics(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('timeframe') timeframe?: string
  ) {
    this.requireInternalAccess(headers);
    return this.authService.getUserGrowthAnalytics(timeframe);
  }

  @Get('internal/admin/users-by-ids')
  getUsersByIds(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('ids') ids: string,
  ) {
    this.requireInternalAccess(headers);
    if (!ids) return [];
    const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    return this.authService.getUsersByIds(idArray);
  }

  @Get('me')
  async getMe(@Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const users = await this.authService.getUsersByIds([parseInt(userId, 10)]);
    if (!users || users.length === 0) throw new UnauthorizedException('User not found');
    return users[0];
  }
  @Put('internal/admin/addresses/update-status-by-location')
  updateAddressStatusByLocation(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() data: { level: string; code: string; status: string },
  ) {
    this.requireInternalAccess(headers);
    return this.authService.updateAddressStatusByLocation(data.level, data.code, data.status);
  }
}

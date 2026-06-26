import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('auth/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ───────── INTERNAL ADMIN ENDPOINTS ─────────
  // These must be defined BEFORE the user-facing routes to avoid
  // being caught by the `:id` param wildcard.

  private requireInternalAccess(
    headers: Record<string, string | string[] | undefined>,
  ) {
    const expectedToken =
      process.env.INTERNAL_SERVICE_TOKEN ?? 'internal-dev-token';
    const actualToken = headers['x-internal-token'];
    const normalizedToken = Array.isArray(actualToken)
      ? actualToken[0]
      : actualToken;
    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  @Get('internal/admin/stats')
  getWalletStats(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.getWalletStats();
  }

  @Get('internal/admin/wallets')
  getAllWallets(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.getAllWallets({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('internal/admin/wallets/:userId')
  getWalletByUserId(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('userId') userId: string,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.getWalletByUserId(+userId);
  }

  @Get('internal/admin/transactions')
  getAllTransactions(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.getAllTransactions({
      type,
      status,
      userId: userId ? +userId : undefined,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('internal/admin/transactions/:id')
  getTransactionByIdAdmin(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.getTransactionByIdAdmin(+id);
  }

  @Put('internal/admin/transactions/:id/status')
  updateTransactionStatus(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.updateTransactionStatus(+id, status);
  }

  @Post('internal/transfer')
  internalTransfer(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.internalTransfer(
      +body.from_user_id,
      +body.to_user_id,
      Number(body.amount),
      body.description || '',
      body.reference_id,
      body.reference_type,
      body.transaction_type,
    );
  }

  @Post('internal/credit')
  internalCredit(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.internalCredit(
      +body.user_id,
      Number(body.amount),
      body.description || '',
      body.reference_id,
      body.reference_type,
      body.transaction_type,
    );
  }

  @Get('internal/platform-user-id')
  getPlatformUserId(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    this.requireInternalAccess(headers);
    return this.walletService.getPlatformUserId();
  }

  // ───────── USER-FACING ENDPOINTS ─────────

  private getUserId(req: any): number {
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return parseInt(userId);
  }

  @Get()
  getMyWallet(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.walletService.getOrCreateWallet(userId);
  }

  @Post('topup')
  topUp(@Req() req: any, @Body() body: any) {
    const userId = this.getUserId(req);
    return this.walletService.topUp(
      userId,
      Number(body.amount),
      body.payment_method,
      body.description,
    );
  }

  @Post('withdraw')
  withdraw(@Req() req: any, @Body() body: any) {
    const userId = this.getUserId(req);
    return this.walletService.withdraw(
      userId,
      Number(body.amount),
      body.description,
    );
  }

  @Get('transactions')
  getMyTransactions(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.walletService.getTransactions(userId, {
      type,
      status,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('transactions/:id')
  getTransactionDetail(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.walletService.getTransactionById(userId, +id);
  }
}

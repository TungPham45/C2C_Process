import { Controller, Get, Post, Put, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('reasons')
  getReportReasons(@Query('category') category?: string) {
    return this.reportService.getReportReasons(category);
  }

  @Post()
  createReport(@Headers('x-user-id') userIdStr: string, @Body() data: any) {
    if (!userIdStr) {
      throw new UnauthorizedException('User ID is required');
    }
    const userId = Number(userIdStr);
    return this.reportService.createReport(userId, data);
  }

  @Get('admin')
  getAllReports(@Headers('x-role') role: string, @Query('status') status?: string) {
    if (role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }
    return this.reportService.getAllReports(status);
  }

  @Put('admin/:id/status')
  updateReportStatus(
    @Param('id') id: string,
    @Headers('x-user-id') adminIdStr: string,
    @Headers('x-role') role: string,
    @Body() data: { status: string; admin_note?: string; resolution?: string; action?: string }
  ) {
    if (role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }
    const adminId = adminIdStr ? Number(adminIdStr) : null;
    return this.reportService.updateReportStatus(Number(id), data.status, adminId, data.admin_note, data.resolution, data.action);
  }

}

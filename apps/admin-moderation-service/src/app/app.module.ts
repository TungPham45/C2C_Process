import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from './prisma.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [],
  controllers: [AdminController, ReportController],
  providers: [AdminService, PrismaService, ReportService],
})
export class AppModule {}

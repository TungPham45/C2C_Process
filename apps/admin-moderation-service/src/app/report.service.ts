import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AdminService } from './admin.service';

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}


  async getReportReasons(category?: string) {
    if (category) {
      return this.prisma.reportReason.findMany({
        where: { category, is_active: true },
      });
    }
    return this.prisma.reportReason.findMany({
      where: { is_active: true },
    });
  }

  async createReport(reporterId: number, data: any) {
    return this.prisma.report.create({
      data: {
        reporter_id: reporterId,
        target_type: data.target_type,
        product_id: data.product_id ? Number(data.product_id) : undefined,
        shop_id: data.shop_id ? Number(data.shop_id) : undefined,
        shop_order_id: data.shop_order_id ? Number(data.shop_order_id) : undefined,
        report_reason_id: Number(data.report_reason_id),
        custom_reason: data.custom_reason,
        description: data.description,
        evidence_urls: data.evidence_urls ? data.evidence_urls : [],
        status: 'pending',
      },
    });
  }

  async getAllReports(status?: string) {
    const reports = await this.prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        report_reason: true,
      },
    });

    return this.adminService.hydrateReports(reports);
  }

  async getReportById(id: number) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        report_reason: true,
      },
    });
    if (!report) throw new NotFoundException(`Report #${id} not found`);
    const hydrated = await this.adminService.hydrateReports([report]);
    return hydrated[0];
  }

  async updateReportStatus(
    reportId: number, 
    status: string, 
    adminId: number, 
    adminNote?: string, 
    resolution?: string,
    action?: string
  ) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    // --- Thực hiện các hành động thực tế (Side Effects) ---
    if (action && action !== 'none') {
      try {
        switch (action) {
          case 'lock_product':
            if (report.product_id) {
              await this.adminService.adminUpdateProductStatus(report.product_id, 'rejected', resolution || adminNote);
            }
            break;
          
          case 'restore_product':
            if (report.product_id) {
              await this.adminService.adminUpdateProductStatus(report.product_id, 'active', 'Admin restored product after re-evaluation');
            }
            break;
            
          case 'suspend_shop':
            if (report.shop_id) {
              await this.adminService.updateShopStatus(report.shop_id, 'suspended');
            } else if (report.product_id) {
              const product = await this.adminService.adminUpdateProductStatus(report.product_id, 'rejected');
              if (product && product.shop_id) {
                await this.adminService.updateShopStatus(product.shop_id, 'suspended');
              }
            }
            break;

          case 'activate_shop':
            if (report.shop_id) {
              await this.adminService.updateShopStatus(report.shop_id, 'active');
            }
            break;

          case 'suspend_reported_user':
            let userIdToLock: number | null = null;
            if (report.shop_id) {
              const shop = await this.adminService.getShopsByIds([report.shop_id]).then(shops => shops[0]);
              userIdToLock = shop?.owner_id || null;
            } else if (report.product_id) {
              const productDetail = await this.adminService.getProductsByIds([report.product_id]).then(res => res[0]);
              if (productDetail && productDetail.shop_id) {
                const shop = await this.adminService.getShopsByIds([productDetail.shop_id]).then(shops => shops[0]);
                userIdToLock = shop?.owner_id || null;
              }
            }

            if (userIdToLock) {
              await this.adminService.updateUserStatus(userIdToLock, 'suspended');
            }
            break;

          case 'activate_user':
             let userIdToUnlock: number | null = null;
             if (report.shop_id) {
               const shop = await this.adminService.getShopsByIds([report.shop_id]).then(shops => shops[0]);
               userIdToUnlock = shop?.owner_id || null;
             } else if (report.product_id) {
                const productDetail = await this.adminService.getProductsByIds([report.product_id]).then(res => res[0]);
                if (productDetail && productDetail.shop_id) {
                  const shop = await this.adminService.getShopsByIds([productDetail.shop_id]).then(shops => shops[0]);
                  userIdToUnlock = shop?.owner_id || null;
                }
             }
             if (userIdToUnlock) {
               await this.adminService.updateUserStatus(userIdToUnlock, 'active');
             }
             break;

          case 'suspend_reporter':
            await this.adminService.updateUserStatus(report.reporter_id, 'suspended');
            break;
            
          case 'activate_reporter':
            await this.adminService.updateUserStatus(report.reporter_id, 'active');
            break;
        }
      } catch (err) {
        console.error(`Failed to execute functional action ${action} for report ${reportId}:`, err);
      }
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        admin_id: adminId,
        admin_note: adminNote,
        resolution,
        resolution_action: action && action !== 'none' ? action : undefined,
        resolved_at: status === 'resolved' || status === 'closed' ? new Date() : undefined,
        updated_at: new Date(),
      },
      include: {
        report_reason: true,
      },
    });
  }


}

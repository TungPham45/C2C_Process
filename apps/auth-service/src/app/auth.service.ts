import { Injectable, Inject, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(EmailService) private emailService: EmailService,
    @Inject(NotificationsService) private notificationsService: NotificationsService
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    if (email === undefined || email === null || String(email).trim() === '') {
      throw new BadRequestException('Email không được để trống');
    }

    if (pass === undefined || pass === null || String(pass).trim() === '') {
      throw new BadRequestException('Mật khẩu không được để trống');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      throw new BadRequestException('Email không đúng định dạng');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email không tồn tại trên hệ thống');
    }

    if (!(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Mật khẩu không chính xác');
    }

    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role, // 'user' | 'admin'
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        shop: null
      }
    };
  }

  async register(data: any) {
    const { password, ...rest } = data;
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new BadRequestException('Email đã được đăng ký');

    if (data.phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: data.phone } });
      if (existingPhone) throw new BadRequestException('Số điện thoại đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashedPassword,
        role: 'user',
        status: 'pending' // Đã khôi phục bước chờ OTP
      },
    });

    await this.generateAndSendOtp(user.id, user.email, 'REGISTER');

    const { password: _, ...result } = user;
    return result;
  }

  // --- OTP & FORGOT PASSWORD LOGIC ---

  async resendOtp(email: string, purpose: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    await this.generateAndSendOtp(user.id, email, purpose);
    return { message: 'Mã OTP mới đã được gửi' };
  }

  async requestForgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    await this.generateAndSendOtp(user.id, email, 'RESET_PASSWORD');
    return { message: 'OTP sent to email' };
  }

  async verifyOtp(email: string, code: string, purpose: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const verification = await this.prisma.verificationCode.findFirst({
      where: {
        user_id: user.id,
        code,
        purpose,
        is_used: false,
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (purpose === 'REGISTER') {
      // Mark as used
      await this.prisma.verificationCode.update({
        where: { id: verification.id },
        data: { is_used: true }
      });
      // Activate the user
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'active' }
      });
    }

    return { success: true, message: 'OTP verified successfully' };
  }

  async resetPassword(data: any) {
    const { email, code, newPassword } = data;

    // We verify the OTP right before resetting
    await this.verifyOtp(email, code, 'RESET_PASSWORD');

    const user = await this.prisma.user.findUnique({ where: { email } });
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      this.prisma.verificationCode.updateMany({
        where: { user_id: user.id, code, purpose: 'RESET_PASSWORD' },
        data: { is_used: true }
      })
    ]);

    return { message: 'Password reset successfully' };
  }

  async getLatestOtpForEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    const verification = await this.prisma.verificationCode.findFirst({
      where: {
        user_id: user.id,
        is_used: false,
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'desc' }
    });

    return { code: verification?.code };
  }

  private async generateAndSendOtp(userId: number, email: string, purpose: string) {
    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // 10 min expiry

    // Save to DB
    await this.prisma.verificationCode.create({
      data: {
        user_id: userId,
        code,
        purpose,
        expires_at: expiry
      }
    });

    // "Send" Email
    await this.emailService.sendOtpEmail(email, code, purpose);
  }

  async getAdminStats() {
    const [totalUsers, activeUsers, suspendedUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { status: 'active' },
      }),
      this.prisma.user.count({
        where: { status: { not: 'active' } },
      }),
    ]);

    return { totalUsers, activeUsers, suspendedUsers };
  }

  async getAllUsers(search?: string, status?: string, sortBy?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    let orderBy: any = { created_at: 'desc' };
    if (sortBy === 'oldest') {
      orderBy = { created_at: 'asc' };
    } else if (sortBy === 'name_asc') {
      orderBy = { full_name: 'asc' };
    } else if (sortBy === 'name_desc') {
      orderBy = { full_name: 'desc' };
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
        role: true,
        status: true,
        created_at: true,
      },
      orderBy,
    });
  }

  async updateUserStatus(id: number, status: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });

    if (status === 'suspended') {
      await this.notificationsService.createNotification({
        user_id: id,
        title: 'Tài khoản đã bị đình chỉ',
        message: 'Tài khoản của bạn đã bị quản trị viên đình chỉ hoạt động do vi phạm quy tắc cộng đồng hoặc có hành vi gian lận.',
        type: 'SYSTEM'
      });
    } else if (status === 'active') {
      await this.notificationsService.createNotification({
        user_id: id,
        title: 'Tài khoản đã được khôi phục',
        message: 'Chào mừng trở lại! Tài khoản của bạn đã được kích hoạt lại.',
        type: 'SYSTEM'
      });
    }

    return { id, status };
  }

  async getUserGrowthAnalytics(timeframe?: string) {
    const whereClause: any = { created_at: { not: null } };

    if (timeframe === 'week') {
      const dt = new Date();
      dt.setDate(dt.getDate() - 7);
      whereClause.created_at = { gte: dt, not: null };
    } else if (timeframe === 'month') {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - 1);
      whereClause.created_at = { gte: dt, not: null };
    }

    const users = await this.prisma.user.findMany({
      select: { created_at: true },
      where: whereClause,
      orderBy: { created_at: 'asc' }
    });

    const growth: Record<string, number> = {};

    users.forEach(user => {
      if (user.created_at) {
        // format YYYY-MM-DD
        const date = user.created_at.toISOString().split('T')[0];
        growth[date] = (growth[date] || 0) + 1;
      }
    });

    return Object.entries(growth).map(([date, newUsers]) => ({
      date,
      newUsers
    }));
  }

  async getUsersByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, full_name: true, email: true, avatar_url: true, status: true },
    });
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: number, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const fullName = typeof data?.full_name === 'string' ? data.full_name.trim() : undefined;
    const phone = typeof data?.phone === 'string' ? data.phone.trim() : undefined;

    if (fullName !== undefined && fullName.length > 255) {
      throw new BadRequestException('Họ tên không được vượt quá 255 ký tự');
    }

    if (phone !== undefined) {
      if (!phone) {
        throw new BadRequestException('Số điện thoại không được để trống');
      }

      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (existingPhone) {
        throw new BadRequestException('Số điện thoại đã được sử dụng');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName !== undefined ? { full_name: fullName || null } : {}),
        ...(phone !== undefined ? { phone } : {}),
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
        role: true,
        status: true,
      },
    });
  }

  async getAddresses(userId: number) {
    return this.prisma.address.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_default: 'desc' },
        { updated_at: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async createAddress(userId: number, data: any) {
    const payload = this.normalizeAddressPayload(data);
    const currentAddressCount = await this.prisma.address.count({
      where: { user_id: userId },
    });
    const shouldSetDefault = payload.is_default || currentAddressCount === 0;

    const results = await this.prisma.$transaction([
      ...(shouldSetDefault
        ? [
          this.prisma.address.updateMany({
            where: { user_id: userId, is_default: true },
            data: { is_default: false, updated_at: new Date() },
          }),
        ]
        : []),
      this.prisma.address.create({
        data: {
          user_id: userId,
          recipient_name: payload.recipient_name,
          phone_number: payload.phone_number,
          province_code: payload.province_code,
          ward_code: payload.ward_code,
          address_line: payload.address_line,
          label: payload.label,
          is_default: shouldSetDefault,
          status: 'active',
          updated_at: new Date(),
        },
      }),
    ]);

    return results[results.length - 1];
  }

  async updateAddress(userId: number, addressId: number, data: any) {
    const existingAddress = await this.ensureAddressOwnership(addressId, userId);
    const payload = this.normalizeAddressPayload(data);
    const shouldSetDefault = payload.is_default || Boolean(existingAddress.is_default);

    const operations: any[] = [];
    if (payload.is_default) {
      operations.push(
        this.prisma.address.updateMany({
          where: { user_id: userId, is_default: true, NOT: { id: addressId } },
          data: { is_default: false, updated_at: new Date() },
        }),
      );
    }

    operations.push(
      this.prisma.address.update({
        where: { id: addressId },
        data: {
          recipient_name: payload.recipient_name,
          phone_number: payload.phone_number,
          province_code: payload.province_code,
          ward_code: payload.ward_code,
          address_line: payload.address_line,
          label: payload.label,
          status: 'active',
          is_default: shouldSetDefault,
          updated_at: new Date(),
        },
      }),
    );

    const results = await this.prisma.$transaction(operations);
    return results[results.length - 1];
  }

  async deleteAddress(userId: number, addressId: number) {
    const address = await this.ensureAddressOwnership(addressId, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({
        where: { id: addressId },
      });

      if (!address.is_default) {
        return;
      }

      const nextAddress = await tx.address.findFirst({
        where: { user_id: userId },
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      });

      if (nextAddress) {
        await tx.address.update({
          where: { id: nextAddress.id },
          data: { is_default: true, updated_at: new Date() },
        });
      }
    });

    return { success: true };
  }

  async setDefaultAddress(userId: number, addressId: number) {
    await this.ensureAddressOwnership(addressId, userId);

    const [, address] = await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { user_id: userId, is_default: true, NOT: { id: addressId } },
        data: { is_default: false, updated_at: new Date() },
      }),
      this.prisma.address.update({
        where: { id: addressId },
        data: { is_default: true, updated_at: new Date() },
      }),
    ]);

    return address;
  }

  private normalizeAddressPayload(data: any) {
    const recipient_name = String(data?.recipient_name ?? '').trim();
    const phone_number = String(data?.phone_number ?? '').trim();
    const province_code = String(data?.province_code ?? '').trim();
    const ward_code = String(data?.ward_code ?? '').trim();
    const address_line = String(data?.address_line ?? '').trim();
    const rawLabel = String(data?.label ?? '').trim().toLowerCase();
    const is_default = Boolean(data?.is_default);
    const label = rawLabel || 'other';

    if (!recipient_name) {
      throw new BadRequestException('Tên người nhận là bắt buộc');
    }

    if (!phone_number) {
      throw new BadRequestException('Số điện thoại là bắt buộc');
    }

    if (!province_code) {
      throw new BadRequestException('Mã tỉnh/thành là bắt buộc');
    }

    if (!ward_code) {
      throw new BadRequestException('Mã phường/xã là bắt buộc');
    }

    if (!address_line) {
      throw new BadRequestException('Địa chỉ chi tiết là bắt buộc');
    }

    if (recipient_name.length > 255) {
      throw new BadRequestException('Tên người nhận không được vượt quá 255 ký tự');
    }

    if (phone_number.length > 20) {
      throw new BadRequestException('Số điện thoại không được vượt quá 20 ký tự');
    }

    if (province_code.length > 10 || ward_code.length > 10) {
      throw new BadRequestException('Mã địa giới không hợp lệ');
    }

    if (label.length > 50) {
      throw new BadRequestException('Nhãn địa chỉ không được vượt quá 50 ký tự');
    }

    return {
      recipient_name,
      phone_number,
      province_code,
      ward_code,
      address_line,
      label,
      is_default,
    };
  }

  private async ensureAddressOwnership(addressId: number, userId: number) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        user_id: userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ nhận hàng');
    }

    return address;
  }

  async updateAddressStatusByLocation(level: string, code: string, status: string) {
    if (level === 'province') {
      await this.prisma.address.updateMany({
        where: { province_code: code },
        data: { status, updated_at: new Date() },
      });
    } else if (level === 'ward') {
      await this.prisma.address.updateMany({
        where: { ward_code: code },
        data: { status, updated_at: new Date() },
      });
    }
    return { success: true };
  }
}

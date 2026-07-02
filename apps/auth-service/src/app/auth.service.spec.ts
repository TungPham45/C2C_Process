import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import * as bcrypt from 'bcryptjs';

// Mock bcryptjs
jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let jwtService: DeepMockProxy<JwtService>;

  beforeEach(async () => {
    // Create deep mock instances (type-safe, auto-mocks all methods)
    prisma = mockDeep<PrismaService>();
    jwtService = mockDeep<JwtService>();

    jwtService.signAsync.mockResolvedValue('mock-jwt-token' as never);

    const emailService = mockDeep<EmailService>();
    const notificationsService = mockDeep<NotificationsService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── validateUser ─────────────────────────────────────────────

  describe('validateUser', () => {
    it('should throw BadRequestException when email is empty', async () => {
      await expect(service.validateUser('', 'password123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when email is null', async () => {
      await expect(service.validateUser(null as any, 'password123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is empty', async () => {
      await expect(service.validateUser('test@example.com', '')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is null', async () => {
      await expect(service.validateUser('test@example.com', null as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid email format', async () => {
      await expect(service.validateUser('not-an-email', 'password123')).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('notfound@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
        full_name: 'Test User',
        role: 'user',
      } as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user without password when credentials are correct', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
        full_name: 'Test User',
        role: 'user',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'correct-password');

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  // ─── login ────────────────────────────────────────────────────

  describe('login', () => {
    it('should return access_token and user info', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
      };

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        shop: null,
      });
    });

    it('should call jwtService.signAsync with correct payload', async () => {
      const mockUser = {
        id: 42,
        email: 'seller@example.com',
        role: 'user',
      };

      await service.login(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 42,
        email: 'seller@example.com',
        role: 'user',
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: DeepMockProxy<AuthService>;
  let jwtService: DeepMockProxy<JwtService>;

  beforeEach(async () => {
    authService = mockDeep<AuthService>();
    jwtService = mockDeep<JwtService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ─── POST /auth/login ─────────────────────────────────────────

  describe('login', () => {
    it('should return token when credentials are valid', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'user' };
      const mockLoginResult = {
        access_token: 'jwt-token',
        user: { id: 1, email: 'test@example.com', full_name: 'Test', role: 'user', shop: null },
      };

      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockLoginResult);

      const result = await controller.login({ email: 'test@example.com', password: 'password123' });

      expect(result).toEqual(mockLoginResult);
      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login({ email: 'notfound@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── requireInternalAccess ────────────────────────────────────

  describe('requireInternalAccess (private method via endpoint)', () => {
    it('should not throw when valid internal token is provided', () => {
      const method = (controller as any).requireInternalAccess.bind(controller);

      // Default token in dev is 'internal-dev-token'
      expect(() => method({ 'x-internal-token': 'internal-dev-token' })).not.toThrow();
    });

    it('should throw ForbiddenException when token is missing', () => {
      const method = (controller as any).requireInternalAccess.bind(controller);

      expect(() => method({})).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when token is wrong', () => {
      const method = (controller as any).requireInternalAccess.bind(controller);

      expect(() => method({ 'x-internal-token': 'wrong-token' })).toThrow(ForbiddenException);
    });

    it('should handle array-style header values', () => {
      const method = (controller as any).requireInternalAccess.bind(controller);

      expect(() => method({ 'x-internal-token': ['internal-dev-token'] })).not.toThrow();
    });
  });
});

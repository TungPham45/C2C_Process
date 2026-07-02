import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { ProductService } from './product.service';
import { PrismaService } from './prisma.service';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    // mockDeep auto-creates all Prisma model delegates (shop, product, category, etc.)
    prisma = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  // ─── requireActiveSellerShop ──────────────────────────────────

  describe('requireActiveSellerShop (via updateShop)', () => {
    it('should throw UnauthorizedException when no shop found for user', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      await expect(service.updateShop(999, { name: 'New Name' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── updateShop ───────────────────────────────────────────────

  describe('updateShop', () => {
    const mockShop = {
      id: 1,
      owner_id: 1,
      name: 'Old Shop',
      slug: 'old-shop',
      description: 'A shop',
      logo_url: null,
      rating: 0,
      status: 'active',
      created_at: new Date(),
      _count: { followers: 0, products: 0 },
    };

    it('should update shop name successfully', async () => {
      prisma.shop.findFirst
        .mockResolvedValueOnce(mockShop as any)  // findSellerShopAnyStatus
        .mockResolvedValueOnce(null as any);     // duplicate name check returns null
      prisma.shop.update.mockResolvedValue({ ...mockShop, name: 'New Shop Name' } as any);

      const result = await service.updateShop(1, { name: 'New Shop Name' });

      expect(prisma.shop.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when name is empty', async () => {
      prisma.shop.findFirst.mockResolvedValue(mockShop as any);

      await expect(service.updateShop(1, { name: '   ' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when name is too long', async () => {
      prisma.shop.findFirst.mockResolvedValue(mockShop as any);

      const longName = 'a'.repeat(256);
      await expect(service.updateShop(1, { name: longName })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when duplicate shop name exists', async () => {
      prisma.shop.findFirst
        .mockResolvedValueOnce(mockShop as any)                               // findSellerShopAnyStatus
        .mockResolvedValueOnce({ id: 2, name: 'Taken Name' } as any);        // duplicate check

      await expect(service.updateShop(1, { name: 'Taken Name' })).rejects.toThrow(BadRequestException);
    });

    it('should update description successfully', async () => {
      prisma.shop.findFirst.mockResolvedValue(mockShop as any);
      prisma.shop.update.mockResolvedValue({ ...mockShop, description: 'New description' } as any);

      const result = await service.updateShop(1, { description: 'New description' });

      expect(prisma.shop.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: 'New description' },
      });
    });
  });

  // ─── deleteShop ───────────────────────────────────────────────

  describe('deleteShop', () => {
    it('should throw UnauthorizedException when no shop found', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      await expect(service.deleteShop(999)).rejects.toThrow(UnauthorizedException);
    });

    it('should delete shop successfully', async () => {
      const mockShop = {
        id: 1,
        owner_id: 1,
        name: 'My Shop',
        slug: 'my-shop',
        description: null,
        logo_url: null,
        rating: 0,
        status: 'active',
        created_at: new Date(),
        _count: { followers: 0, products: 0 },
      };

      prisma.shop.findFirst.mockResolvedValue(mockShop as any);
      prisma.shop.delete.mockResolvedValue(mockShop as any);

      const result = await service.deleteShop(1);

      expect(prisma.shop.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  // ─── requireActiveShop ────────────────────────────────────────

  describe('requireActiveShop (private, tested indirectly)', () => {
    it('should throw NotFoundException when shop is not active', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      const method = (service as any).requireActiveShop.bind(service);
      await expect(method(999)).rejects.toThrow(NotFoundException);
    });
  });
});

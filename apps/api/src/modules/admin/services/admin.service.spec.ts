import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

// Minimal stubs — only the methods called by the tests
const makePrisma = (overrides = {}) => ({
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  paymentConfig: { findUnique: jest.fn(), upsert: jest.fn() },
  ...overrides,
});

const makeStorage = () => ({
  getSignedReadUrl: jest.fn().mockResolvedValue('https://signed.url/qr.webp'),
  upload: jest.fn(),
  buildKey: { ebookFile: jest.fn(), ebookCover: jest.fn(), tarotCover: jest.fn(), tarotBack: jest.fn() },
  getSignedUploadUrl: jest.fn(),
});

const makeCatalog = () => ({
  setEbookPublishedByProductId: jest.fn(),
  setTarotDeckPublishedByProductId: jest.fn(),
  createEbook: jest.fn(),
  createTarotDeck: jest.fn(),
  updateEbookById: jest.fn(),
  updateTarotDeckById: jest.fn(),
  findCoverImageUrls: jest.fn(),
});

const makeMaintenance = () => ({
  getConfig: jest.fn(),
  setConfig: jest.fn(),
});

function buildService(prismaOverrides = {}) {
  const prisma = makePrisma(prismaOverrides) as any;
  const storage = makeStorage() as any;
  const catalog = makeCatalog() as any;
  const maintenance = makeMaintenance() as any;
  return { service: new AdminService(prisma, storage, catalog, maintenance), prisma, catalog };
}

// ─── getAllProducts ───────────────────────────────────────────────────────────

describe('AdminService.getAllProducts', () => {
  it('returns all products when no merchantId (admin)', async () => {
    const { service, prisma } = buildService();
    prisma.product.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);

    await service.getAllProducts();

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: false } }),
    );
  });

  it('filters by uploadedBy when merchantId provided', async () => {
    const { service, prisma } = buildService();
    prisma.product.findMany.mockResolvedValue([{ id: '1' }]);

    await service.getAllProducts('merchant-123');

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: false, uploadedBy: 'merchant-123' } }),
    );
  });
});

// ─── deleteProduct ────────────────────────────────────────────────────────────

describe('AdminService.deleteProduct', () => {
  const ownerId = 'owner-abc';
  const otherId = 'other-xyz';
  const productId = 'prod-1';

  it('allows owner merchant to delete their own draft', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: productId, uploadedBy: ownerId, isPublished: false });
    prisma.product.update.mockResolvedValue({});

    await expect(service.deleteProduct(productId, ownerId, false)).resolves.not.toThrow();
  });

  it('blocks merchant from deleting another merchant product', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: productId, uploadedBy: ownerId, isPublished: false });

    await expect(service.deleteProduct(productId, otherId, false)).rejects.toThrow(NotFoundException);
  });

  it('allows admin to delete any product', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: productId, uploadedBy: ownerId, isPublished: false });
    prisma.product.update.mockResolvedValue({});

    await expect(service.deleteProduct(productId, otherId, true)).resolves.not.toThrow();
  });

  it('blocks deleting a published product', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: productId, uploadedBy: ownerId, isPublished: true });

    await expect(service.deleteProduct(productId, ownerId, false)).rejects.toThrow(BadRequestException);
  });
});

// ─── setPublished ─────────────────────────────────────────────────────────────

describe('AdminService.setPublished', () => {
  const ownerId = 'owner-abc';
  const otherId = 'other-xyz';
  const productId = 'prod-1';

  it('allows merchant to publish own product', async () => {
    const { service, prisma, catalog } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: productId, uploadedBy: ownerId, productType: 'EBOOK' });
    prisma.product.update.mockResolvedValue({ id: productId, productType: 'EBOOK' });
    catalog.setEbookPublishedByProductId.mockResolvedValue(undefined);

    await expect(service.setPublished(productId, true, ownerId, false)).resolves.not.toThrow();
  });

  it('blocks merchant from publishing another merchant product', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: productId, uploadedBy: ownerId, productType: 'EBOOK' });

    await expect(service.setPublished(productId, true, otherId, false)).rejects.toThrow(NotFoundException);
  });

  it('allows admin to publish any product', async () => {
    const { service, prisma, catalog } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: productId, uploadedBy: ownerId, productType: 'EBOOK' });
    prisma.product.update.mockResolvedValue({ id: productId, productType: 'EBOOK' });
    catalog.setEbookPublishedByProductId.mockResolvedValue(undefined);

    await expect(service.setPublished(productId, true, otherId, true)).resolves.not.toThrow();
  });
});

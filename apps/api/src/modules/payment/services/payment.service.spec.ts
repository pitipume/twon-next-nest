import { PaymentService } from './payment.service';

const makeRepo = (overrides = {}) => ({
  findOrderWithItems: jest.fn(),
  findPaymentByOrderId: jest.fn(),
  submitSlip: jest.fn(),
  approvePayment: jest.fn(),
  rejectPayment: jest.fn(),
  grantLibraryAccess: jest.fn(),
  findPendingOrders: jest.fn(),
  getCommissionRate: jest.fn().mockResolvedValue(0),
  ...overrides,
});

const makeStorage = () => ({
  getSignedReadUrl: jest.fn().mockResolvedValue('https://signed.url/slip.jpg'),
  upload: jest.fn().mockResolvedValue(undefined),
});

function buildService(repoOverrides = {}) {
  const repo = makeRepo(repoOverrides) as any;
  const storage = makeStorage() as any;
  return { service: new PaymentService(repo, storage), repo };
}

// ─── Commission calculation ───────────────────────────────────────────────────

describe('PaymentService.approvePayment — commission snapshot', () => {
  const orderId = 'order-1';
  const adminId = 'admin-1';

  const orderWithItems = (prices: number[]) => ({
    id: orderId,
    userId: 'user-1',
    status: 'WAITING_APPROVAL',
    orderItems: prices.map((price, i) => ({
      id: `item-${i}`,
      productId: `prod-${i}`,
      priceTHB: price,
    })),
  });

  it('writes 0 commission when rate is 0%', async () => {
    const { service, repo } = buildService({
      findOrderWithItems: jest.fn().mockResolvedValue(orderWithItems([500])),
      getCommissionRate: jest.fn().mockResolvedValue(0),
      approvePayment: jest.fn().mockResolvedValue(undefined),
      grantLibraryAccess: jest.fn().mockResolvedValue(undefined),
    });

    await service.approvePayment(orderId, adminId);

    expect(repo.approvePayment).toHaveBeenCalledWith(
      orderId,
      adminId,
      [{ id: 'item-0', commissionRate: 0, commissionAmount: 0, netAmount: 500 }],
    );
  });

  it('calculates 15% commission correctly', async () => {
    const { service, repo } = buildService({
      findOrderWithItems: jest.fn().mockResolvedValue(orderWithItems([500])),
      getCommissionRate: jest.fn().mockResolvedValue(0.15),
      approvePayment: jest.fn().mockResolvedValue(undefined),
      grantLibraryAccess: jest.fn().mockResolvedValue(undefined),
    });

    await service.approvePayment(orderId, adminId);

    expect(repo.approvePayment).toHaveBeenCalledWith(
      orderId,
      adminId,
      [{ id: 'item-0', commissionRate: 0.15, commissionAmount: 75, netAmount: 425 }],
    );
  });

  it('rounds commission to 2 decimal places', async () => {
    const { service, repo } = buildService({
      findOrderWithItems: jest.fn().mockResolvedValue(orderWithItems([100])),
      getCommissionRate: jest.fn().mockResolvedValue(0.15),
      approvePayment: jest.fn().mockResolvedValue(undefined),
      grantLibraryAccess: jest.fn().mockResolvedValue(undefined),
    });

    await service.approvePayment(orderId, adminId);

    const [, , items] = repo.approvePayment.mock.calls[0];
    expect(items[0].commissionAmount).toBe(15);
    expect(items[0].netAmount).toBe(85);
  });

  it('handles multiple items correctly', async () => {
    const { service, repo } = buildService({
      findOrderWithItems: jest.fn().mockResolvedValue(orderWithItems([200, 300])),
      getCommissionRate: jest.fn().mockResolvedValue(0.1),
      approvePayment: jest.fn().mockResolvedValue(undefined),
      grantLibraryAccess: jest.fn().mockResolvedValue(undefined),
    });

    await service.approvePayment(orderId, adminId);

    const [, , items] = repo.approvePayment.mock.calls[0];
    expect(items[0]).toMatchObject({ commissionAmount: 20, netAmount: 180 });
    expect(items[1]).toMatchObject({ commissionAmount: 30, netAmount: 270 });
  });

  it('returns null when order not found', async () => {
    const { service } = buildService({
      findOrderWithItems: jest.fn().mockResolvedValue(null),
    });

    const result = await service.approvePayment(orderId, adminId);
    expect(result).toBeNull();
  });

  it('grants library access for all products after approval', async () => {
    const { service, repo } = buildService({
      findOrderWithItems: jest.fn().mockResolvedValue(orderWithItems([100, 200])),
      getCommissionRate: jest.fn().mockResolvedValue(0),
      approvePayment: jest.fn().mockResolvedValue(undefined),
      grantLibraryAccess: jest.fn().mockResolvedValue(undefined),
    });

    await service.approvePayment(orderId, adminId);

    expect(repo.grantLibraryAccess).toHaveBeenCalledWith('user-1', orderId, ['prod-0', 'prod-1']);
  });
});

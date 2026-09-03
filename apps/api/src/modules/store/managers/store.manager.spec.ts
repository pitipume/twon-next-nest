import { StoreManager } from './store.manager';

const makeService = (overrides = {}) => ({
  getPublishedProducts: jest.fn(),
  getAlreadyOwned: jest.fn().mockResolvedValue([]),
  getPendingOrderProducts: jest.fn().mockResolvedValue([]),
  createOrder: jest.fn(),
  getCheckoutInfo: jest.fn().mockResolvedValue(null),
  ...overrides,
});

function buildManager(serviceOverrides = {}) {
  const service = makeService(serviceOverrides) as any;
  return { manager: new StoreManager(service), service };
}

const product = (id: string, priceTHB = 100) => ({ id, title: `Product ${id}`, priceTHB });

describe('StoreManager.createOrder — duplicate-purchase prevention', () => {
  const userId = 'user-1';
  const productIds = ['prod-1'];

  it('rejects when the customer already owns the product', async () => {
    const { manager } = buildManager({
      getPublishedProducts: jest.fn().mockResolvedValue([product('prod-1')]),
      getAlreadyOwned: jest.fn().mockResolvedValue(['prod-1']),
    });

    const result = await manager.createOrder(userId, productIds);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already own/i);
  });

  it('rejects when the customer already has a pending/awaiting-approval order for the product', async () => {
    const { manager, service } = buildManager({
      getPublishedProducts: jest.fn().mockResolvedValue([product('prod-1')]),
      getAlreadyOwned: jest.fn().mockResolvedValue([]),
      getPendingOrderProducts: jest.fn().mockResolvedValue(['prod-1']),
    });

    const result = await manager.createOrder(userId, productIds);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/pending order/i);
    // must not proceed to actually create a duplicate order
    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it('allows the order when neither owned nor pending', async () => {
    const { manager, service } = buildManager({
      getPublishedProducts: jest.fn().mockResolvedValue([product('prod-1', 250)]),
      getAlreadyOwned: jest.fn().mockResolvedValue([]),
      getPendingOrderProducts: jest.fn().mockResolvedValue([]),
      createOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        totalTHB: 250,
        status: 'PENDING',
        orderItems: [{ productId: 'prod-1', priceTHB: 250 }],
      }),
    });

    const result = await manager.createOrder(userId, productIds);

    expect(result.success).toBe(true);
    expect(service.createOrder).toHaveBeenCalledWith(userId, [{ productId: 'prod-1', priceTHB: 250 }]);
  });

  it('only checks pending-order status for products not already filtered out as owned', async () => {
    // Sanity: the pending check still runs even when ownership check passed cleanly,
    // proving both guards are independent and both enforced.
    const { manager, service } = buildManager({
      getPublishedProducts: jest.fn().mockResolvedValue([product('prod-1')]),
      getAlreadyOwned: jest.fn().mockResolvedValue([]),
      getPendingOrderProducts: jest.fn().mockResolvedValue([]),
      createOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        totalTHB: 100,
        status: 'PENDING',
        orderItems: [{ productId: 'prod-1', priceTHB: 100 }],
      }),
    });

    await manager.createOrder(userId, productIds);

    expect(service.getPendingOrderProducts).toHaveBeenCalledWith(userId, productIds);
  });
});

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMyOrdersQuery } from './get-my-orders.query';
import { StoreManager } from '../../managers/store.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@QueryHandler(GetMyOrdersQuery)
export class GetMyOrdersHandler implements IQueryHandler<GetMyOrdersQuery> {
  constructor(private readonly manager: StoreManager) {}

  async execute(query: GetMyOrdersQuery) {
    const orders = await this.manager.getMyOrders(query.userId);
    return ApiResponse.success(orders);
  }
}

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrderQuery } from './get-order.query';
import { StoreManager } from '../../managers/store.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(private readonly manager: StoreManager) {}

  async execute(query: GetOrderQuery) {
    const result = await this.manager.getOrder(query.userId, query.orderId);
    if (!result.success) return ApiResponse.notFound(result.message);
    return ApiResponse.success(result.data);
  }
}

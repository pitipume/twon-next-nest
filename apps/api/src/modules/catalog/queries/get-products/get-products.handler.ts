import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductsQuery } from './get-products.query';
import { CatalogManager } from '../../managers/catalog.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@QueryHandler(GetProductsQuery)
export class GetProductsHandler implements IQueryHandler<GetProductsQuery> {
  constructor(private readonly manager: CatalogManager) {}

  async execute(query: GetProductsQuery) {
    const result = await this.manager.listProducts(query.type, query.page, query.limit);
    return ApiResponse.success(result);
  }
}

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductDetailQuery } from './get-product-detail.query';
import { CatalogManager } from '../../managers/catalog.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@QueryHandler(GetProductDetailQuery)
export class GetProductDetailHandler implements IQueryHandler<GetProductDetailQuery> {
  constructor(private readonly manager: CatalogManager) {}

  async execute(query: GetProductDetailQuery) {
    const result =
      query.productType === 'ebook'
        ? await this.manager.getEbookDetail(query.productId)
        : await this.manager.getTarotDeckDetail(query.productId);

    if (!result) {
      return ApiResponse.notFound('Product not found.');
    }

    return ApiResponse.success(result);
  }
}

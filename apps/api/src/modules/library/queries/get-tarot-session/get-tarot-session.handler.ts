import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTarotSessionQuery } from './get-tarot-session.query';
import { LibraryManager } from '../../managers/library.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@QueryHandler(GetTarotSessionQuery)
export class GetTarotSessionHandler implements IQueryHandler<GetTarotSessionQuery> {
  constructor(private readonly manager: LibraryManager) {}

  async execute(query: GetTarotSessionQuery) {
    const result = await this.manager.getTarotSession(query.userId, query.productId);
    if (!result.success) return ApiResponse.failure(result.message);
    return ApiResponse.success(result.data);
  }
}

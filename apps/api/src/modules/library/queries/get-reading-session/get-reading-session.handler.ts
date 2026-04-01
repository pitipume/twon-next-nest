import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReadingSessionQuery } from './get-reading-session.query';
import { LibraryManager } from '../../managers/library.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@QueryHandler(GetReadingSessionQuery)
export class GetReadingSessionHandler implements IQueryHandler<GetReadingSessionQuery> {
  constructor(private readonly manager: LibraryManager) {}

  async execute(query: GetReadingSessionQuery) {
    const result = await this.manager.getEbookSession(query.userId, query.productId);
    if (!result.success) return ApiResponse.failure(result.message);
    return ApiResponse.success(result.data);
  }
}

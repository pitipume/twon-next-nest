import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryQuery } from './get-library.query';
import { LibraryManager } from '../../managers/library.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@QueryHandler(GetLibraryQuery)
export class GetLibraryHandler implements IQueryHandler<GetLibraryQuery> {
  constructor(private readonly manager: LibraryManager) {}

  async execute(query: GetLibraryQuery) {
    const items = await this.manager.getLibrary(query.userId);
    return ApiResponse.success(items);
  }
}

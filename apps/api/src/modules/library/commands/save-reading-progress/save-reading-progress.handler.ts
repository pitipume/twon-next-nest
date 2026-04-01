import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SaveReadingProgressCommand } from './save-reading-progress.command';
import { LibraryManager } from '../../managers/library.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@CommandHandler(SaveReadingProgressCommand)
export class SaveReadingProgressHandler implements ICommandHandler<SaveReadingProgressCommand> {
  constructor(private readonly manager: LibraryManager) {}

  async execute(command: SaveReadingProgressCommand) {
    const result = await this.manager.saveProgress(
      command.userId,
      command.productId,
      command.currentPage,
      command.totalPages,
    );

    if (!result.success) return ApiResponse.failure(result.message);
    return ApiResponse.success(undefined, 'Progress saved.');
  }
}

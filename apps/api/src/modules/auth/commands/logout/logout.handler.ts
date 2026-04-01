import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from './logout.command';
import { AuthManager } from '../../managers/auth.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: LogoutCommand): Promise<ApiResponse> {
    await this.manager.logout(command.userId, command.refreshToken);
    return ApiResponse.success(undefined, 'Logged out successfully.');
  }
}

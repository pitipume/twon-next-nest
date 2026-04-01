import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshTokenCommand } from './refresh-token.command';
import { AuthManager } from '../../managers/auth.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: RefreshTokenCommand): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const result = await this.manager.refreshToken(command.refreshToken);

    if (!result.success) {
      return ApiResponse.invalidCredentials('Invalid or expired refresh token.');
    }

    // Pass both tokens — controller sets refreshToken as HttpOnly cookie, strips it from body
    return ApiResponse.success({
      accessToken: result.accessToken!,
      refreshToken: result.refreshToken!,
    });
  }
}

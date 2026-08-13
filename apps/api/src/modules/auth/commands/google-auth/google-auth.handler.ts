import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GoogleAuthCommand } from './google-auth.command';
import { AuthManager } from '../../managers/auth.manager';
import { ApiResponse } from '../../../../common/response/api-response';
import { TokenPairResponse } from '../verify-register/verify-register.handler';

@CommandHandler(GoogleAuthCommand)
export class GoogleAuthHandler implements ICommandHandler<GoogleAuthCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: GoogleAuthCommand): Promise<ApiResponse<TokenPairResponse>> {
    const result = await this.manager.loginOrRegisterWithGoogle({
      googleId: command.googleId,
      email: command.email,
      displayName: command.displayName,
    });

    if (!result.success) {
      return ApiResponse.failure(result.message ?? 'Google sign-in failed.');
    }

    return ApiResponse.success(result.data);
  }
}

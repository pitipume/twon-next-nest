import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginCommand } from './login.command';
import { AuthManager } from '../../managers/auth.manager';
import { ApiResponse } from '../../../../common/response/api-response';
import { TokenPairResponse } from '../verify-register/verify-register.handler';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: LoginCommand): Promise<ApiResponse<TokenPairResponse>> {
    const result = await this.manager.login(command.email, command.password);

    if (!result.success) {
      return ApiResponse.invalidCredentials();
    }

    return ApiResponse.success(result.data);
  }
}

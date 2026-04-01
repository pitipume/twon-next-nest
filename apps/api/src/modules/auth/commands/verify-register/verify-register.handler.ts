import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VerifyRegisterCommand } from './verify-register.command';
import { AuthManager } from '../../managers/auth.manager';
import { ApiResponse } from '../../../../common/response/api-response';

export interface TokenPairResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

@CommandHandler(VerifyRegisterCommand)
export class VerifyRegisterHandler implements ICommandHandler<VerifyRegisterCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: VerifyRegisterCommand): Promise<ApiResponse<TokenPairResponse>> {
    const result = await this.manager.verifyRegister(command.email, command.otp, command.password);

    if (!result.success) {
      return ApiResponse.failure(result.message!);
    }

    return ApiResponse.success(result.data, 'Registration successful.');
  }
}

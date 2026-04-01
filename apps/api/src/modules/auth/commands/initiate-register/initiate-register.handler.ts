import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InitiateRegisterCommand } from './initiate-register.command';
import { AuthManager } from '../../managers/auth.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@CommandHandler(InitiateRegisterCommand)
export class InitiateRegisterHandler implements ICommandHandler<InitiateRegisterCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: InitiateRegisterCommand): Promise<ApiResponse> {
    // Input already normalized by class-transformer in the DTO (@Transform decorator)

    const result = await this.manager.initiateRegister(command.email, command.displayName);

    if (!result.success) {
      // Email already registered → conflict
      return ApiResponse.conflict(result.message!);
    }

    return ApiResponse.success(undefined, 'OTP sent to your email. It expires in 5 minutes.');
  }
}

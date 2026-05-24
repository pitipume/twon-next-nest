import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthManager } from '../../managers/auth.manager';
import { ForgotPasswordCommand } from './forgot-password.command';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: ForgotPasswordCommand) {
    await this.manager.forgotPassword(command.email);
    // Always return success — never reveal whether the email exists
    return { code: 'A001', message: 'If that email exists, a reset code has been sent.' };
  }
}

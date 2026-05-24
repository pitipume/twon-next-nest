import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { AuthManager } from '../../managers/auth.manager';
import { ResetPasswordCommand } from './reset-password.command';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: ResetPasswordCommand) {
    const result = await this.manager.resetPassword(
      command.email,
      command.otp,
      command.newPassword,
    );

    if (!result.success) {
      throw new BadRequestException(result.message ?? 'Invalid or expired code.');
    }

    return { code: 'A001', message: 'Password reset successfully. Please sign in.' };
  }
}

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { AuthManager } from '../../managers/auth.manager';
import { ChangePasswordCommand } from './change-password.command';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: ChangePasswordCommand) {
    const result = await this.manager.changePassword(
      command.userId,
      command.currentPassword,
      command.newPassword,
    );

    if (!result.success) {
      throw new BadRequestException(result.message ?? 'Failed to change password.');
    }

    return { code: 'A001', message: 'Password changed successfully.' };
  }
}

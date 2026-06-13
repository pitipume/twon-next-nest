import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { AuthManager } from '../../managers/auth.manager';
import { UpdateProfileCommand } from './update-profile.command';

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: UpdateProfileCommand) {
    const result = await this.manager.updateProfile(command.userId, command.displayName);

    if (!result.success) {
      throw new BadRequestException(result.message ?? 'Failed to update profile.');
    }

    return { code: 'A001', message: 'Profile updated.', data: result.data };
  }
}

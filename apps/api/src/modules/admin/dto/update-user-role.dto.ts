import { IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsUUID('4')
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
}

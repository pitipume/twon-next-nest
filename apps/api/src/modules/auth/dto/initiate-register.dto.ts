import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class InitiateRegisterDto {
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Display name is required.' })
  @MaxLength(100, { message: 'Display name must not exceed 100 characters.' })
  @Transform(({ value }) => value?.trim())
  displayName: string;
}

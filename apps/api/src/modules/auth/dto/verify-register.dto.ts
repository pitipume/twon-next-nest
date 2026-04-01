import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyRegisterDto {
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required.' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;
}

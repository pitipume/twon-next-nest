import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UploadTarotDeckDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceTHB: number;

  // R2 keys set by the client after direct upload
  @IsString()
  @IsNotEmpty()
  zipKey: string;

  @IsOptional()
  @IsString()
  coverKey?: string;

  @IsOptional()
  @IsString()
  backKey?: string;
}

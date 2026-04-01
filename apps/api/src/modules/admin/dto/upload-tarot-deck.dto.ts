import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UploadTarotDeckDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceTHB: number;
}

import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UploadEbookDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  author: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceTHB: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  previewPages: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  categories?: string; // comma-separated: "spirituality,tarot"

  @IsOptional()
  @IsString()
  tags?: string; // comma-separated
}

import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceTHB: number;

  @IsInt()
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

  // R2 keys set by the client after direct upload
  @IsString()
  @IsNotEmpty()
  pdfKey: string;

  @IsOptional()
  @IsString()
  coverKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalPages?: number;
}

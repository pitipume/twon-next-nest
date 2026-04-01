import { IsInt, IsPositive, Min } from 'class-validator';

export class SaveProgressDto {
  @IsInt()
  @IsPositive()
  currentPage: number;

  @IsInt()
  @Min(1)
  totalPages: number;
}

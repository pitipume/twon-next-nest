import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitSlipDto {
  @IsUUID('4')
  @IsNotEmpty()
  orderId: string;

  @IsDateString({}, { message: 'transferredAt must be a valid ISO date string.' })
  transferredAt: string; // when the customer made the transfer e.g. "2025-04-01T14:30:00.000Z"

  @IsOptional()
  @IsString()
  note?: string;
}

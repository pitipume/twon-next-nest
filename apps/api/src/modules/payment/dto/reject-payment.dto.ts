import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required.' })
  reason: string;
}

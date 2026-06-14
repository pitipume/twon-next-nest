import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class ApproveBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  orderIds: string[];
}

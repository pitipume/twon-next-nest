import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product is required.' })
  @IsUUID('4', { each: true, message: 'Each productId must be a valid UUID.' })
  productIds: string[];
}

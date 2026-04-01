import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateOrderCommand } from './create-order.command';
import { StoreManager } from '../../managers/store.manager';
import { ApiResponse } from '../../../../common/response/api-response';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(private readonly manager: StoreManager) {}

  async execute(command: CreateOrderCommand) {
    const result = await this.manager.createOrder(command.userId, command.productIds);
    if (!result.success) return ApiResponse.failure(result.message);
    return ApiResponse.success(result.data);
  }
}

import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreManager } from './managers/store.manager';
import { StoreService } from './services/store.service';
import { StoreRepository } from './repositories/store.repository';
import { CreateOrderHandler } from './commands/create-order/create-order.handler';
import { GetOrderHandler } from './queries/get-order/get-order.handler';
import { GetMyOrdersHandler } from './queries/get-my-orders/get-my-orders.handler';

const CommandHandlers = [CreateOrderHandler];
const QueryHandlers = [GetOrderHandler, GetMyOrdersHandler];

@Module({
  controllers: [StoreController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    StoreManager,
    StoreService,
    StoreRepository,
  ],
  exports: [StoreService], // Payment module needs StoreService to update order status
})
export class StoreModule {}

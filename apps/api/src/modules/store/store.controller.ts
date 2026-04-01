import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderCommand } from './commands/create-order/create-order.command';
import { GetOrderQuery } from './queries/get-order/get-order.query';

@UseGuards(JwtAuthGuard)
@Controller('store')
export class StoreController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // POST /api/store/orders
  @Post('orders')
  createOrder(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOrderDto,
  ) {
    return this.commandBus.execute(new CreateOrderCommand(user.id, dto.productIds));
  }

  // GET /api/store/orders/:orderId
  @Get('orders/:orderId')
  getOrder(
    @CurrentUser() user: { id: string },
    @Param('orderId') orderId: string,
  ) {
    return this.queryBus.execute(new GetOrderQuery(user.id, orderId));
  }
}

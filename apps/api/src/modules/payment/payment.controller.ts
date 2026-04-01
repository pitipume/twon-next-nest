import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentManager } from './managers/payment.manager';
import { SubmitSlipDto } from './dto/submit-slip.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { ApiResponse } from '../../common/response/api-response';

const ALLOWED_SLIP_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly manager: PaymentManager) {}

  // POST /api/payment/slip
  // Customer uploads payment slip (multipart/form-data)
  // Fields: orderId, transferredAt, note (optional), file: slip image
  @Post('slip')
  @UseInterceptors(FileInterceptor('file'))
  async submitSlip(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubmitSlipDto,
  ) {
    if (!file) throw new BadRequestException('Slip image is required.');
    if (!ALLOWED_SLIP_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Slip must be a JPEG, PNG, or WebP image.');
    }
    if (file.size > MAX_SLIP_SIZE_BYTES) {
      throw new BadRequestException('Slip image must be smaller than 5 MB.');
    }

    const result = await this.manager.submitSlip(
      user.id,
      dto.orderId,
      file.buffer,
      file.mimetype,
      new Date(dto.transferredAt),
      dto.note,
    );

    if (!result.success) return ApiResponse.failure(result.message);
    return ApiResponse.success(null, result.message);
  }

  // POST /api/payment/orders/:orderId/approve  [ADMIN]
  @Post('orders/:orderId/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async approvePayment(
    @CurrentUser() user: { id: string },
    @Param('orderId') orderId: string,
  ) {
    const result = await this.manager.approvePayment(user.id, orderId);
    if (!result.success) return ApiResponse.failure(result.message);
    return ApiResponse.success(null, result.message);
  }

  // POST /api/payment/orders/:orderId/reject  [ADMIN]
  @Post('orders/:orderId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async rejectPayment(
    @CurrentUser() user: { id: string },
    @Param('orderId') orderId: string,
    @Body() dto: RejectPaymentDto,
  ) {
    const result = await this.manager.rejectPayment(user.id, orderId, dto.reason);
    if (!result.success) return ApiResponse.failure(result.message);
    return ApiResponse.success(null, result.message);
  }

  // GET /api/payment/orders/pending  [ADMIN]
  @Get('orders/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getPendingOrders() {
    const orders = await this.manager.getPendingOrders();
    return ApiResponse.success(orders);
  }
}

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PaymentController } from './payment.controller';
import { PaymentManager } from './managers/payment.manager';
import { PaymentService } from './services/payment.service';
import { PaymentRepository } from './repositories/payment.repository';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [PaymentController],
  providers: [PaymentManager, PaymentService, PaymentRepository],
})
export class PaymentModule {}

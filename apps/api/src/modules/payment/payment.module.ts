import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PaymentController } from './payment.controller';
import { PaymentManager } from './managers/payment.manager';
import { PaymentService } from './services/payment.service';
import { PaymentRepository } from './repositories/payment.repository';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    NotificationModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentManager, PaymentService, PaymentRepository],
})
export class PaymentModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { LibraryModule } from './modules/library/library.module';
import { AdminModule } from './modules/admin/admin.module';
import { StoreModule } from './modules/store/store.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CqrsModule.forRoot(),
    // MongoDB — async so ConfigService is available for URI
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    // Infrastructure (global — available everywhere)
    PrismaModule,
    RedisModule,
    StorageModule,
    // Feature modules
    NotificationModule,
    AuthModule,
    CatalogModule,
    LibraryModule,
    AdminModule,
    StoreModule,
    PaymentModule,
  ],
})
export class AppModule {}

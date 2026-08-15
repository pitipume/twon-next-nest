import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
import { SystemModule } from './modules/system/system.module';
import { MaintenanceGuard } from './modules/system/guards/maintenance.guard';

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
    SystemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: MaintenanceGuard },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminController } from './admin.controller';
import { AdminService } from './services/admin.service';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    // Store uploaded files in memory (buffer) — we upload directly to R2
    // Max 50MB per upload request
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
    CatalogModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SystemController } from './system.controller';
import { MaintenanceService } from './services/maintenance.service';
import { MaintenanceGuard } from './guards/maintenance.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SystemController],
  providers: [MaintenanceService, MaintenanceGuard],
  // JwtModule re-exported too — APP_GUARD instantiates MaintenanceGuard
  // fresh in AppModule's own injector context, so all of its constructor
  // deps (not just MaintenanceGuard itself) must be resolvable from there.
  exports: [JwtModule, MaintenanceService, MaintenanceGuard],
})
export class SystemModule {}

import { Controller, Get } from '@nestjs/common';
import { MaintenanceService } from './services/maintenance.service';
import { ApiResponse } from '../../common/response/api-response';

@Controller('system')
export class SystemController {
  constructor(private readonly maintenance: MaintenanceService) {}

  // GET /api/system/maintenance-status — public, no auth. Polled by the
  // frontend to decide whether to show the maintenance takeover.
  @Get('maintenance-status')
  async getMaintenanceStatus() {
    const config = await this.maintenance.getConfig();
    return ApiResponse.success({ enabled: config.enabled, backByAt: config.backByAt });
  }
}

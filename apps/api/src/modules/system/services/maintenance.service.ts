import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const config = await this.prisma.maintenanceConfig.findUnique({ where: { id: 'singleton' } });
    return config ?? { id: 'singleton', enabled: false, backByAt: null };
  }

  async setConfig(params: { enabled: boolean; backByAt?: Date | null }) {
    const data = { enabled: params.enabled, backByAt: params.backByAt ?? null };
    return this.prisma.maintenanceConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });
  }
}

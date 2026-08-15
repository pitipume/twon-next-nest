import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

export class SetMaintenanceConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsISO8601()
  backByAt?: string; // optional ETA; omit/null = no ETA shown
}

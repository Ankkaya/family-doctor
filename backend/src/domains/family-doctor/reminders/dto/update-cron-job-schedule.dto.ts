import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';

export class UpdateCronJobScheduleDto {
  @ApiPropertyOptional({ enum: ['enabled', 'disabled', 'expired'] })
  @IsOptional()
  @IsIn(['enabled', 'disabled', 'expired'])
  status?: 'enabled' | 'disabled' | 'expired';

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  nextRunAt?: string | null;
}

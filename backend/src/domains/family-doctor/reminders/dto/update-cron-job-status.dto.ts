import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateCronJobStatusDto {
  @ApiProperty({ enum: ['enabled', 'disabled', 'expired'] })
  @IsIn(['enabled', 'disabled', 'expired'])
  status!: 'enabled' | 'disabled' | 'expired';
}

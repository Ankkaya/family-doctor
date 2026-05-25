import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateAppUserStatusDto {
  @ApiProperty({ description: 'App 用户状态', enum: ['active', 'disabled'] })
  @IsIn(['active', 'disabled'])
  status: 'active' | 'disabled';
}

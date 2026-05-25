import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHouseholdMemberDto {
  @ApiPropertyOptional({ description: '成员角色', enum: ['owner', 'member'] })
  @IsOptional()
  @IsIn(['owner', 'member'])
  role?: 'owner' | 'member';

  @ApiPropertyOptional({ description: '成员在家庭内显示名', example: '妈妈' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayName?: string;
}

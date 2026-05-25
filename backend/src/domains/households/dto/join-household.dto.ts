import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class JoinHouseholdDto {
  @ApiProperty({ description: '家庭邀请码，6 位十六进制', example: 'A3F91C' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString()
  @Matches(/^[0-9a-fA-F]{6}$/, { message: '家庭邀请码必须是 6 位十六进制字符' })
  code!: string;
}

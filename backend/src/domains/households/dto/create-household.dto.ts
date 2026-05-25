import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHouseholdDto {
  @ApiProperty({ description: '家庭名称', example: '我的家庭' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({
    example: '10.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  commission: number;
}

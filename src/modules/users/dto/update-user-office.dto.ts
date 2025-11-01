import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateUserOfficeDto {
  @ApiProperty({
    example: 'c4d2d3e2-3f92-4a6d-9d0d-123456789abc',
    description: 'Office UUID',
  })
  @IsUUID()
  NewOfficeUUID: string;
}

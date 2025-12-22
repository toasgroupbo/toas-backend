import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserOfficeDto {
  @ApiProperty({
    example: '1',
    description: 'Office ID',
  })
  NewOfficeId: number;
}

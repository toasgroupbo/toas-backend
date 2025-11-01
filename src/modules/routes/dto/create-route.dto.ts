import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({
    description: 'Office UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  officeOriginUUID: string;

  @ApiProperty({
    description: 'Office UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  officeDestinationUUID: string;
}

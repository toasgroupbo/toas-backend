import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePassengerInAppDto {
  @ApiProperty({
    example: 'juan Perez',
  })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '32423534' })
  @IsString()
  ci: string;
}

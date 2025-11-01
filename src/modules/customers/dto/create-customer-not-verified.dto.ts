import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCustomerNotVerifiedDto {
  @ApiProperty({
    example: 'juan',
  })
  @IsString()
  name: string;

  @ApiProperty({ example: '32423534' })
  @IsString()
  ci: string;
}

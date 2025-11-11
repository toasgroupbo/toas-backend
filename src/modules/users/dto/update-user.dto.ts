import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsEmpty()
  email?: string;

  @IsEmpty()
  password?: string;

  /*   @ApiPropertyOptional({
    description: 'Role UUID',
    example: '1',
  })
  @IsOptional()
  @IsNumber()
  rol?: number; */
}

import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, [/* 'email',  */ 'password'] as const),
) {
  @ApiPropertyOptional({
    description: 'Role ID',
    example: '1',
  })
  @IsOptional()
  @IsNumber()
  rol?: number;
}

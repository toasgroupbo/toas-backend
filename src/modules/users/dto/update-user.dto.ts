import {
  ApiPropertyOptional,
  IntersectionType,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { CurrentPasswordDto } from './current-password.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateUserDto extends IntersectionType(
  PartialType(OmitType(CreateUserDto, ['password'] as const)),
  CurrentPasswordDto,
) {
  @ApiPropertyOptional({
    description: 'Role ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  rol?: number;
}

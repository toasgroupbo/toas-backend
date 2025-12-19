import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum } from 'class-validator';

import {
  ValidPermissions,
  ValidResoursesForAdmins,
} from '../../../common/enums';

export class CreateRolePermissionDto {
  @ApiProperty({
    description: 'resourse',
    enum: ValidResoursesForAdmins,
    example: ValidResoursesForAdmins.COMPANY,
  })
  @IsEnum(ValidResoursesForAdmins)
  resourse: ValidResoursesForAdmins;

  @ApiProperty({
    description: 'permissions',
    enum: ValidPermissions,
    isArray: true,
    example: [ValidPermissions.CREATE, ValidPermissions.READ],
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(ValidPermissions, { each: true })
  permissions: ValidPermissions[];
}

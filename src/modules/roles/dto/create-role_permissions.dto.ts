import { ArrayUnique, IsArray, IsEnum } from 'class-validator';
import {
  ValidPermissions,
  ValidResourses,
  ValidResoursesForAdmins,
} from '../../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRolePermissionDto {
  @ApiProperty({
    description: 'resourse',
    enum: ValidResoursesForAdmins,
    example: ValidResoursesForAdmins.COMPANY,
  })
  @IsEnum(ValidResoursesForAdmins)
  resourse: ValidResoursesForAdmins; //ValidResourses; //! para los admins

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

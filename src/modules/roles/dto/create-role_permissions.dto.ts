import { ArrayUnique, IsArray, IsEnum, IsString } from 'class-validator';
import { ValidPermissions, ValidResourses } from '../../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRolePermissionDto {
  @ApiProperty({
    description: 'resourse',
    enum: ValidResourses,
    example: ValidResourses.ROL,
  })
  @IsEnum(ValidResourses)
  resourse: ValidResourses;

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

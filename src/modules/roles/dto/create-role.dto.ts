import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { CreateRolePermissionDto } from './create-role_permissions.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'Admin',
  })
  @IsString()
  name: string;

  @ApiProperty({
    type: [CreateRolePermissionDto],
    example: [
      {
        resourse: 'ROL',
        permissions: ['CREATE', 'READ'],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRolePermissionDto)
  permissions: CreateRolePermissionDto[];
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';

export class StaffMemberDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  name: string;

  @ApiProperty({ example: '1234567' })
  @IsString()
  ci: string;

  @ApiProperty({ example: '78945612', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignStaffDto {
  @ApiProperty({ type: [StaffMemberDto], minItems: 1 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffMemberDto)
  @ArrayMinSize(1)
  drivers: StaffMemberDto[];

  @ApiProperty({ type: [StaffMemberDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StaffMemberDto)
  assistants?: StaffMemberDto[];
}

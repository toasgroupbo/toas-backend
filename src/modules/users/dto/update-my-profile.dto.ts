import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';
import { CurrentPasswordDto } from './current-password.dto';

//! solo datos personales: email, rol, empresa y oficina los cambia el super-admin
export class UpdateMyProfileDto extends IntersectionType(
  PartialType(PickType(CreateUserDto, ['fullName', 'ci', 'phone'] as const)),
  CurrentPasswordDto,
) {}

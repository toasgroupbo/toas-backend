import { UseGuards, applyDecorators } from '@nestjs/common';

import { ValidPermissions } from '../../common/enums';
import { Permissions } from './permission.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { JwtAuthGuard } from '../guards';

export function Auth(...permission: ValidPermissions[]) {
  return applyDecorators(
    Permissions(...permission),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}

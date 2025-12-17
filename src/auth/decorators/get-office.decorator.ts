import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from 'src/modules/users/entities/user.entity';

export const GetOffice = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new InternalServerErrorException('User not found in request');
    }

    // --------------------------------------------------------------------------
    // 1. Pbtiene la office del usuario si existe
    // --------------------------------------------------------------------------

    if (user.office) return user.office;

    // --------------------------------------------------------------------------
    // 2. Si no hay ninguna forma de determinar la office
    // --------------------------------------------------------------------------

    throw new ForbiddenException('The Office could not be determined.');
  },
);

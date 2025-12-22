import {
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  createParamDecorator,
  InternalServerErrorException,
} from '@nestjs/common';
import { isNumber } from 'class-validator';

import { User } from 'src/modules/users/entities/user.entity';

export const GetCompany = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    const companyId: number = Number(request.query.companyId);

    if (!user) {
      throw new InternalServerErrorException('User not found in request');
    }

    // --------------------------------------------------------------------------
    // 1. Prioriza la empresa del usuario si existe
    // --------------------------------------------------------------------------

    if (user.company) return user.company.id;

    // --------------------------------------------------------------------------
    // 2. Si hay companyId en query, valida que sea un Id válido
    // --------------------------------------------------------------------------

    if (companyId) {
      if (typeof companyId !== 'number' || !isNumber(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      return companyId;
    }

    // --------------------------------------------------------------------------
    // 3. Si no hay ninguna forma de determinar la empresa
    // --------------------------------------------------------------------------

    throw new ForbiddenException('The company could not be determined.');
  },
);

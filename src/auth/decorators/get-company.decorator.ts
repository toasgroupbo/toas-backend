import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { User } from 'src/modules/users/entities/user.entity';
import { validate as isUUID } from 'uuid';

export const GetCompany = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    const companyUUID = request.query.companyUUID;

    if (!user) {
      throw new InternalServerErrorException('User not found in request');
    }

    // --------------------------------------------------------------------------
    // 1. Prioriza la empresa del usuario si existe
    // --------------------------------------------------------------------------

    if (user.company) return user.company.id;

    // --------------------------------------------------------------------------
    // 2. Si hay companyUUID en query, valida que sea un UUID válido
    // --------------------------------------------------------------------------

    if (companyUUID) {
      if (typeof companyUUID !== 'string' || !isUUID(companyUUID)) {
        throw new BadRequestException('Invalid companyUUID format');
      }
      return companyUUID;
    }

    // --------------------------------------------------------------------------
    // 3. Si no hay ninguna forma de determinar la empresa
    // --------------------------------------------------------------------------

    throw new ForbiddenException('The company could not be determined.');
  },
);

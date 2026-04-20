import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

import { LoginType } from 'src/common/enums';

import { User } from 'src/modules/users/entities/user.entity';

export const GetUser = createParamDecorator(
  (data: string, cxt: ExecutionContext) => {
    const req = cxt.switchToHttp().getRequest();

    const user: User = req.user;
    const userType = req.userType;

    if (!user)
      throw new UnauthorizedException('User or Customer not found (request)');

    if (userType !== LoginType.user) {
      throw new UnauthorizedException('You need to be a user');
    }

    return user;
  },
);

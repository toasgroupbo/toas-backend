import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

import { User } from 'src/modules/users/entities/user.entity';

export const GetUser = createParamDecorator(
  (data: string, cxt: ExecutionContext) => {
    const req = cxt.switchToHttp().getRequest();
    const user: User = req.user;

    if (!user)
      throw new UnauthorizedException('User or Customer not found (request)');

    if (!(user instanceof User)) {
      throw new UnauthorizedException('You need to be a user');
    }

    return user;
  },
);

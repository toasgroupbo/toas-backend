import {
  ExecutionContext,
  createParamDecorator,
  UnauthorizedException,
} from '@nestjs/common';

import { LoginType } from 'src/common/enums';

export const GetCustomer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    const user = req.user;
    const userType = req.userType;

    if (!user) {
      throw new UnauthorizedException('User not found (request)');
    }

    if (userType !== LoginType.customer) {
      throw new UnauthorizedException('You need to be a customer');
    }

    return user;
  },
);

/* export const GetCustomer = createParamDecorator(
  (data: string, cxt: ExecutionContext) => {
    const req = cxt.switchToHttp().getRequest();
    const customer: Customer = req.user;

    if (!customer)
      throw new UnauthorizedException('Customer not found (request)');

    if (!(customer instanceof Customer)) {
      throw new UnauthorizedException('You need to be a customer');
    }

    return customer;
  },
); */

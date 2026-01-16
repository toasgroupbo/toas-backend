import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

import { Customer } from 'src/modules/customers/entities/customer.entity';

export const GetCustomer = createParamDecorator(
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
);

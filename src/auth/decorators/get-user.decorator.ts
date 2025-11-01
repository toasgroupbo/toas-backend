import {
  ExecutionContext,
  createParamDecorator,
  InternalServerErrorException,
} from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string, cxt: ExecutionContext) => {
    const req = cxt.switchToHttp().getRequest();
    const user = req.user;

    // el decorador se puede usar en el controlador para obtener el usuario
    if (!user) return undefined; /* throw new InternalServerErrorException(
        'User not found (request)',
      ); */

    return user;
  },
);

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { envs } from 'src/config/environments/environments';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      response.status(200).json({
        State: '003',
        Mensaje: 'Credenciales incorrectas',
        Data: {
          id: `E-${Date.now()}`,
        },
      });
      return false;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'ascii',
    );
    const [username, password] = credentials.split(':');

    if (username !== envs.BCP_USER || password !== envs.BCP_PUBLIC_TOKEN) {
      response.status(200).json({
        State: '003',
        Mensaje: 'Credenciales incorrectas',
        Data: {
          id: `E-${Date.now()}`,
        },
      });
      return false;
    }

    return true;
  }
}

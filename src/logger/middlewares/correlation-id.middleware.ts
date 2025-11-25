import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoggerContext } from '../logger-context';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const correlationId =
      req.headers['x-correlation-id']?.toString() || randomUUID();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    // Creamos el contexto una sola vez
    LoggerContext.enterWith(correlationId);

    next();
  }
}

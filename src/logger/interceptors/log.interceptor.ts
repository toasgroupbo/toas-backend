// src/logger/interceptors/log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { LogService } from '../logger.service';
import { LogLevel } from '../enums/log-level.enum';

@Injectable()
export class TransactionLogInterceptor implements NestInterceptor {
  constructor(private readonly logService: LogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const correlationId = req.correlationId;
    const method = `${req.method} ${req.originalUrl}`;

    this.logService.start(method);
    this.logService.addStep(LogLevel.INFO, 'Transaction started');

    return next.handle().pipe(
      tap(() => this.logService.endOk()),
      catchError((err) => {
        this.logService.endError(err);
        return throwError(() => err);
      }),
    );
  }
}

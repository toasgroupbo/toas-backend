/* import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, EMPTY, map, Observable, of, throwError } from 'rxjs';
import { ResponseDto } from '../dtos/response.dto';
import { ErrorMessages, SuccessMessages } from '../messages/messages'; */

/* @Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = request.method === 'POST' ? 201 : 200;
        const message =
          request.method === 'POST'
            ? 'Recurso creado exitosamente'
            : 'Operación exitosa';

        response.status(statusCode);
        return new ResponseDto(data, message, true, statusCode);
      }),
      catchError((error) => {
        // Manejo extendido de diferentes tipos de errores
        let status = 500;
        let errorMessage = 'Error interno del servidor';

        // 1. Errores HTTP estándar de NestJS
        if (error.getStatus) {
          status = error.getStatus();
          errorMessage = error.message;
        }

        // 2. Errores de validación
        if (status === 400 && error.response?.message) {
          errorMessage = this.formatValidationError(error.response.message);
        }

        // 3. Errores de base de datos
        if (error.code === '23505') {
          // Violación de constraint única en PostgreSQL
          status = 409;
          errorMessage = 'El recurso ya existe';
        }

        // 4. Errores de autenticación personalizados
        if (error.name === 'TokenExpiredError') {
          status = 401;
          errorMessage = 'Token expirado';
        }

        // 5. Errores de autorización personalizados o de negocio
        // if (error.code === 'SOME_CUSTOM_ERROR') {
        //   status = 422;
        //   errorMessage = 'Mensaje personalizado';
        // }

        response.status(status);
        return of(
          new ResponseDto(
            status === 400 ? { errors: this.getValidationErrors(error) } : null,
            errorMessage,
            false,
            status,
          ),
        );
      }),
    );
  }

  private formatValidationError(message: string | string[]): string {
    if (Array.isArray(message)) {
      return 'Error de validación';
    }
    return message;
  }

  private getValidationErrors(error: any): any[] {
    if (error.response?.message && Array.isArray(error.response.message)) {
      return error.response.message;
    }
    return [];
  }
}
 */

/* @Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = this.getSuccessStatusCode(request.method, data);
        const message = this.getSuccessMessage(request.method, statusCode);

        response.status(statusCode);
        return new ResponseDto(data, message, true, statusCode);
      }),
      catchError((error) => {
        const status = this.getErrorStatusCode(error);
        const errorMessage = this.getErrorMessage(error, status);
        const errorData = this.getErrorData(error, status);

        response.status(status);
        return of(new ResponseDto(errorData, errorMessage, false, status));
      }),
    );
  }

  private getSuccessStatusCode(method: string, data: any): number {
    if (method === 'POST') return 201;
    if (method === 'DELETE' && (data === undefined || data === null))
      return 204;
    return 200;
  }

  private getSuccessMessage(method: string, statusCode: number): string {
    return (
      SuccessMessages[statusCode] ||
      (method === 'POST' ? 'Recurso creado exitosamente' : 'Operación exitosa')
    );
  }

  private getErrorStatusCode(error: any): number {
    if (error.getStatus) return error.getStatus();
    if (error.code === '23505') return 409; // Violación de constraint única
    if (error.name === 'TokenExpiredError') return 401;
    return 500;
  }

  private getErrorMessage(error: any, status: number): string {
    // 1. Usar el mensaje personalizado de la excepción si existe
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }

    // 2. Usar el mensaje de error estándar para el código HTTP
    return ErrorMessages[status] || 'Error interno del servidor';
  }

  private getErrorData(error: any, status: number): any {
    if (status === 400 && error.response?.message) {
      return {
        errors: Array.isArray(error.response.message)
          ? error.response.message
          : [error.response.message],
      };
    }
    return null;
  }
}
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        if (typeof data?.error !== 'boolean') {
          const auxData = {
            error: false,
            message: 'Respuesta exitosa',
            response: {
              data: data,
            },
            status: 200,
          };
          response.status(auxData.status);
          return auxData;
        } else {
          if (typeof data.status == 'number' && data.status > 200)
            response.status(data.status);
          else if (!data.error) {
            data.status = 200;
            response.status(200);
          } else {
            data.status = 422;
            response.status(422);
          }
          return data;
        }
      }),
    );
  }
}

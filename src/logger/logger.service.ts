// src/logger/logger.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { LogEntry } from './interfaces/log-entry.interface';
import { LogLevel } from './enums/log-level.enum';
import { Log } from './entities/log.entity';
import { LoggerContext } from './logger-context';

@Injectable()
export class LogService {
  constructor(@InjectRepository(Log) private repo: Repository<Log>) {}

  private logs = new Map<
    string,
    {
      start: Date;
      method: string;
      steps: LogEntry[];
      end?: Date;
      success?: boolean;
      error?: any;
      duration?: number;
    }
  >();

  private getCorrelationId() {
    return LoggerContext.getStore();
  }

  start(method: string) {
    const correlationId = this.getCorrelationId();
    if (!correlationId) return;

    this.logs.set(correlationId, {
      start: new Date(),
      method,
      steps: [],
    });
  }

  addStep(level: LogLevel, message: string) {
    const correlationId = this.getCorrelationId();
    if (!correlationId) return;

    const log = this.logs.get(correlationId);
    if (!log) return;

    log.steps.push({
      timestamp: new Date(),
      level,
      message,
    });
  }

  async endOk() {
    const correlationId = this.getCorrelationId();
    if (!correlationId) return;

    const log = this.logs.get(correlationId);
    if (!log) return;

    this.addStep(LogLevel.INFO, 'Request completed successfully');

    log.end = new Date();
    log.success = true;
    log.duration = log.end.getTime() - log.start.getTime();

    await this.repo.save({
      correlationId,
      method: log.method,
      success: true,
      steps: log.steps,
      error: null,
    });

    this.logs.delete(correlationId);
  }

  async endError(error: any) {
    const correlationId = this.getCorrelationId();
    if (!correlationId) return;

    const log = this.logs.get(correlationId);
    if (!log) return;

    // Guardamos un step con el mensaje real del error
    this.addStep(LogLevel.ERROR, error.message || String(error));

    log.end = new Date();
    log.success = false;

    // Transformamos el error a JSON serializable
    const serializedError = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };

    log.error = serializedError;

    await this.repo.save({
      correlationId,
      method: log.method,
      success: false,
      steps: log.steps,
      error: serializedError,
    });

    this.logs.delete(correlationId);
  }
}

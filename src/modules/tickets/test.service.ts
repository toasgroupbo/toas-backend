import { Injectable } from '@nestjs/common';
import { LogLevel } from 'src/logger/enums/log-level.enum';
import { LogService } from 'src/logger/logger.service';

@Injectable()
export class TestsService {
  constructor(private readonly logService: LogService) {}

  async test() {
    this.logService.addStep(LogLevel.INFO, 'Test step 1 started');

    this.logService.addStep(LogLevel.INFO, 'Test step 2 started');

    this.logService.addStep(LogLevel.WARN, 'Test step 3 started');

    throw new Error('This is a test error for logger');
  }
}

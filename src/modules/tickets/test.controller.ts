import { Controller, Post, Req, UseInterceptors } from '@nestjs/common';
import { TestsService } from './test.service';
import { Request } from 'express';
import { TransactionLogInterceptor } from 'src/logger/interceptors/log.interceptor';

@Controller('test')
export class TestController {
  constructor(private readonly testsService: TestsService) {}

  @UseInterceptors(TransactionLogInterceptor)
  @Post()
  async test(@Req() request: Request) {
    return this.testsService.test();
  }
}

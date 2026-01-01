import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';

import { CustomersModule } from '../customers/customers.module';
import { CorrelationIdMiddleware } from 'src/logger/middlewares/correlation-id.middleware';
import { TicketsForCashiersController } from './tickets-for-cashiers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), CustomersModule],
  controllers: [
    TicketsController,
    TicketsForCashiersController /* TestController */,
  ],
  providers: [TicketsService /* TestsService */],
})
export class TicketsModule {
  /* configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: 'test', method: RequestMethod.POST });
  } */
}

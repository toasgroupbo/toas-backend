import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

import { CustomersInAppController } from './in-app/customers-in-app.controller';
import { CustomersInAppService } from './in-app/customers-in-app.service';

import { CustomersForCashiersController } from './in-office/customers-for-cashiers.controller';
import { CustomersForCashierService } from './in-office/customers-for-cashiers.service';

import { PassengersService } from './passengers.service';
import { Passenger } from './entities/passenger.entity';

import { BillingsService } from './billings.service';
import { Billing } from './entities/billing.entity';

import { PenaltiesService } from './penalties.service';
import { Penalty } from './entities/penalty.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Passenger, Billing, Penalty])],
  controllers: [
    CustomersController,
    CustomersInAppController,
    CustomersForCashiersController,
  ],
  providers: [
    BillingsService,
    CustomersService,
    PenaltiesService,
    PassengersService,
    CustomersInAppService,
    CustomersForCashierService,
  ],
  exports: [
    TypeOrmModule,
    CustomersService,
    PenaltiesService,
    PassengersService,
  ],
})
export class CustomersModule {}

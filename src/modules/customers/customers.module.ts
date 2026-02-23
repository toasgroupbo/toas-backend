import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

import { AuthModule } from 'src/auth/auth.module';

import { PassengersService } from './passengers.service';
import { Passenger } from './entities/passenger.entity';

import { CustomersInAppController } from './customers-in-app.controller';
import { CustomersInAppService } from './customers-in-app.service';

import { CustomersForCashiersController } from './customers-for-cashiers.controller';
import { CustomersForCashierService } from './customers-for-cashiers.service';

import { BillingsService } from './billings.service';
import { Billing } from './entities/billing.entity';

import { PenaltiesService } from './penalties.service';
import { Penalty } from './entities/penalty.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Passenger, Billing, Penalty]),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    CustomersController,
    CustomersForCashiersController,
    CustomersInAppController,
  ],
  providers: [
    CustomersService,
    PassengersService,
    CustomersForCashierService,
    CustomersInAppService,
    BillingsService,
    PenaltiesService,
  ],
  exports: [
    CustomersService,
    TypeOrmModule,
    PenaltiesService,
    PassengersService,
  ],
})
export class CustomersModule {}

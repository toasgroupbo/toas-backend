import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomersForCashiersController } from './customers-for-cashiers.controller';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

import { AuthModule } from 'src/auth/auth.module';

import { Passenger } from './entities/passenger.entity';
import { PassengersService } from './passengers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Passenger]),
    forwardRef(() => AuthModule),
  ],
  controllers: [CustomersController, CustomersForCashiersController],
  providers: [CustomersService, PassengersService],
  exports: [CustomersService, TypeOrmModule],
})
export class CustomersModule {}

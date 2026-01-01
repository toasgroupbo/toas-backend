import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomersForCashiersController } from './customers-for-cashiers.controller';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), forwardRef(() => AuthModule)],
  controllers: [CustomersController, CustomersForCashiersController],
  providers: [CustomersService],
  exports: [CustomersService, TypeOrmModule],
})
export class CustomersModule {}

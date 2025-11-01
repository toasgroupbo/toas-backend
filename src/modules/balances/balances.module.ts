import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';
import { Balance } from './entities/balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Balance])],
  controllers: [BalancesController],
  providers: [BalancesService],
  exports: [BalancesService, TypeOrmModule],
})
export class BalanceModule {}

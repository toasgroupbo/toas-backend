import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WalletService } from './wallet.service';

import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transactions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction])],
  providers: [WalletService],
  exports: [TypeOrmModule, WalletService],
})
export class WalletModule {}

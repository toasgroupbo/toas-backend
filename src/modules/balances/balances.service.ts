import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BalanceType } from './enums/balance-type.enum';

import { Balance } from './entities/balance.entity';

@Injectable()
export class BalancesService {
  constructor(
    @InjectRepository(Balance)
    private readonly blancesRepository: Repository<Balance>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                            Get Current Balance                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async getCurrentBalance(customerUUID: string): Promise<number> {
    //! Suma de recargas vigentes
    const { sum: rechargeSum } = await this.blancesRepository
      .createQueryBuilder('balance')
      .select('COALESCE(SUM(balance.amount), 0)', 'sum')
      .where('balance.customerId = :customerUUID', { customerUUID })
      .andWhere('balance.type = :recharged', {
        recharged: BalanceType.RECHARGE,
      })
      .andWhere('balance.expiresAt > NOW()')
      .getRawOne();

    //! Suma de todos los gastos (siempre cuentan)
    const { sum: spentSum } = await this.blancesRepository
      .createQueryBuilder('balance')
      .select('COALESCE(SUM(balance.amount), 0)', 'sum')
      .where('balance.customerId = :customerUUID', { customerUUID })
      .andWhere('balance.type = :spent', { spent: BalanceType.SPENT })
      .getRawOne();

    // saldo total = recargas vigentes - gastos
    const balance = Number(rechargeSum) + Number(spentSum); // spentSum será negativo

    return balance;
  }
}

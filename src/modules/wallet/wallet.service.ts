import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, MoreThan, LessThan } from 'typeorm';

import { TicketExpirationService } from '../tickets/ticket-expiration.service';

import {
  WalletTransaction,
  TransactionType,
} from './entities/wallet-transactions.entity';
import { Wallet } from './entities/wallet.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import {
  PaymentQR,
  PaymentStatusEnum,
} from '../payments/entities/payment-qr.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,

    //private readonly ticketExpirationService: TicketExpirationService,
  ) {}

  //* ============================================================================================== */
  //*                                       Helpers                                                  */
  //* ============================================================================================== */

  private getWalletRepo(manager?: EntityManager) {
    return manager?.getRepository(Wallet) ?? this.walletRepository;
  }

  private getTransactionRepo(manager?: EntityManager) {
    return (
      manager?.getRepository(WalletTransaction) ?? this.transactionRepository
    );
  }

  //* ============================================================================================== */
  //*                                    Get or Create Wallet                                        */
  //* ============================================================================================== */

  async getOrCreateWallet(
    customer: Customer,
    manager?: EntityManager,
  ): Promise<Wallet> {
    const walletRepo = this.getWalletRepo(manager);

    let wallet = await walletRepo.findOne({
      where: { customer: { id: customer.id } },
      relations: { customer: true },
    });

    if (!wallet) {
      wallet = walletRepo.create({
        customer,
        balance: '0',
      });

      wallet = await walletRepo.save(wallet);
    }

    return wallet;
  }

  //* ============================================================================================== */
  //*                                    Credit from Recharge                                        */
  //* ============================================================================================== */

  async creditFromRecharge(data: {
    customer: Customer;
    amount: number;
    correlationId: string;
    paymentData: any;
    paymentQr: PaymentQR;
    manager: EntityManager;
  }) {
    const { customer, amount, correlationId, paymentData, manager } = data;

    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const wallet = await this.getOrCreateWallet(customer, manager);

    // Verificar idempotencia (evitar doble abono)
    const existingTransaction = await transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        metadata: {
          correlationId,
        },
      },
    });

    if (existingTransaction) {
      return existingTransaction;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const currentBalance = Number(wallet.balance);
    const newBalance = currentBalance + amount;

    const transaction = transactionRepo.create({
      wallet,
      type: TransactionType.CREDIT,
      amount: amount.toString(),
      remainingAmount: amount.toString(),
      balanceAfter: newBalance.toString(),
      expiresAt,
      metadata: {
        reason: 'wallet_recharge',
        correlationId,
        paymentData,
      },
      paymentQr: data.paymentQr,
    });

    wallet.balance = newBalance.toString();

    await walletRepo.save(wallet);
    await transactionRepo.save(transaction);

    return transaction;
  }

  //* ============================================================================================== */
  //*                                Credit from Ticket Cancel                                       */
  //* ============================================================================================== */

  async creditFromTicketCancel(
    ticket: Ticket,
    customer: Customer,
    manager?: EntityManager,
  ) {
    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const wallet = await this.getOrCreateWallet(customer, manager);

    const amount =
      Number(ticket.wallet_amount) +
      Number(ticket.qr_amount) -
      Number(ticket.commission); //! comision  //0

    if (amount <= 0) return null;

    // idempotencia
    const existingCredit = await transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        ticket: { id: ticket.id },
        type: TransactionType.CREDIT,
      },
    });

    if (existingCredit) return existingCredit;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const currentBalance = Number(wallet.balance);
    const newBalance = currentBalance + amount;

    const transaction = transactionRepo.create({
      wallet,
      type: TransactionType.CREDIT,
      amount: amount.toString(),
      remainingAmount: amount.toString(),
      balanceAfter: newBalance.toString(),
      expiresAt,
      ticket,
      metadata: {
        reason: 'ticket_cancelled',
        originalTicketId: ticket.id,
        originalWalletAmount: ticket.wallet_amount,
        originalQrAmount: ticket.qr_amount,
        cancelledAt: new Date().toISOString(),
      },
    });

    wallet.balance = newBalance.toString();

    await walletRepo.save(wallet);
    await transactionRepo.save(transaction);

    return transaction;
  }

  //* ============================================================================================== */
  //*                                 Consume Wallet (FIFO)                                          */
  //* ============================================================================================== */

  /* async consumeForTicket(data: {
    customer: Customer;
    ticket: Ticket;
    amount: number;
    manager?: EntityManager;
  }): Promise<number> {
    if (data.amount <= 0) return 0;

    const walletRepo = this.getWalletRepo(data.manager);
    const transactionRepo = this.getTransactionRepo(data.manager);

    const wallet = await this.getOrCreateWallet(data.customer, data.manager);

    // Verificar saldo suficiente ANTES de consumir
    let availableBalance = await this.getAvailableBalance(
      data.customer,
      data.manager,
    );
    if (availableBalance < data.amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${availableBalance.toFixed(2)}, Required: ${data.amount.toFixed(2)}`,
      );
    }

    let remaining = data.amount;
    const usedCredits: { creditId: number; amount: number }[] = [];

    const credits = await transactionRepo
      .createQueryBuilder('credit')
      .setLock('pessimistic_write')
      .where('credit.walletId = :walletId', { walletId: wallet.id })
      .andWhere('credit.remainingAmount > 0')
      .andWhere('credit.expiresAt > :now', { now: new Date() })
      .orderBy('credit.expiresAt', 'ASC')
      .getMany();

    for (const credit of credits) {
      if (remaining <= 0) break;

      const creditRemaining = Number(credit.remainingAmount);
      const used = Math.min(creditRemaining, remaining);

      credit.remainingAmount = (creditRemaining - used).toString();
      await transactionRepo.save(credit);

      usedCredits.push({
        creditId: credit.id,
        amount: used,
      });

      remaining -= used;
    }

    const usedTotal = data.amount - remaining;

    if (usedTotal > 0) {
      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance - usedTotal;

      // Crear transacción DEBIT con el ticket asociado
      const debit = transactionRepo.create({
        wallet,
        type: TransactionType.DEBIT,
        amount: usedTotal.toString(),
        balanceAfter: newBalance.toString(),
        ticket: data.ticket, // ← Ticket asociado directamente
        metadata: {
          usedCredits,
          totalAmount: usedTotal,
          consumedAt: new Date().toISOString(),
        },
      });

      wallet.balance = newBalance.toString();

      await walletRepo.save(wallet);
      await transactionRepo.save(debit);
    }

    return usedTotal;
  } */

  async consumeForTicket(data: {
    customer: Customer;
    ticket: Ticket;
    amount: number;
    manager?: EntityManager;
  }): Promise<number> {
    const walletRepo = this.getWalletRepo(data.manager);
    const transactionRepo = this.getTransactionRepo(data.manager);

    const wallet = await this.getOrCreateWallet(data.customer, data.manager);

    let remaining = data.amount;
    const usedCredits: { creditId: number; amount: number }[] = [];

    const credits = await transactionRepo
      .createQueryBuilder('credit')
      .setLock('pessimistic_write')
      .where('credit.walletId = :walletId', { walletId: wallet.id })
      .andWhere('credit.remainingAmount > 0')
      .andWhere('credit.expiresAt > :now', { now: new Date() })
      .orderBy('credit.expiresAt', 'ASC')
      .getMany();

    for (const credit of credits) {
      if (remaining <= 0) break;

      const creditRemaining = Number(credit.remainingAmount);
      const used = Math.min(creditRemaining, remaining);

      credit.remainingAmount = (creditRemaining - used).toString();
      await transactionRepo.save(credit);

      usedCredits.push({
        creditId: credit.id,
        amount: used,
      });

      remaining -= used;
    }

    const usedTotal = data.amount - remaining;

    // VALIDACIÓN CRÍTICA
    if (remaining > 0) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    if (usedTotal > 0) {
      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance - usedTotal;

      const debit = transactionRepo.create({
        wallet,
        type: TransactionType.DEBIT,
        amount: usedTotal.toString(),
        balanceAfter: newBalance.toString(),
        ticket: data.ticket,
        metadata: {
          usedCredits,
          totalAmount: usedTotal,
          consumedAt: new Date().toISOString(),
        },
      });

      wallet.balance = newBalance.toString();

      await walletRepo.save(wallet);
      await transactionRepo.save(debit);
    }

    return usedTotal;
  }

  //* ============================================================================================== */
  //*                             Restore Credits from Expired Ticket                                */
  //* ============================================================================================== */

  async restoreCreditsFromExpiredTicket(
    ticket: Ticket,
    manager?: EntityManager,
  ): Promise<void> {
    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const wallet = await this.getOrCreateWallet(ticket.buyer, manager);

    // Buscar el DEBIT asociado a este ticket con lock
    const debit = await transactionRepo
      .createQueryBuilder('tx')
      .setLock('pessimistic_write')
      .where('tx.walletId = :walletId', { walletId: wallet.id })
      .andWhere('tx.ticketId = :ticketId', { ticketId: ticket.id })
      .andWhere('tx.type = :type', { type: TransactionType.DEBIT })
      .getOne();

    if (!debit) return;

    // Idempotencia
    if (debit.metadata?.reversedAt) {
      return;
    }

    const usedCredits =
      (debit.metadata?.usedCredits as { creditId: number; amount: number }[]) ||
      [];

    let restoredTotal = 0;

    for (const uc of usedCredits) {
      const originalCredit = await transactionRepo
        .createQueryBuilder('credit')
        .setLock('pessimistic_write')
        .where('credit.id = :id', { id: uc.creditId })
        .getOne();

      if (!originalCredit) continue;

      const currentRemaining = Number(originalCredit.remainingAmount);
      const restoredAmount = Number(uc.amount);

      originalCredit.remainingAmount = (
        currentRemaining + restoredAmount
      ).toString();

      await transactionRepo.save(originalCredit);

      restoredTotal += restoredAmount;
    }

    // Actualizar balance de wallet
    const currentBalance = Number(wallet.balance);

    wallet.balance = (currentBalance + restoredTotal).toString();

    // Marcar el DEBIT como revertido
    debit.metadata = {
      ...debit.metadata,
      reversedAt: new Date().toISOString(),
      reversedBecause: 'ticket_expired',
    };

    // Crear transacción de auditoría
    const adjustment = transactionRepo.create({
      wallet,
      type: TransactionType.EXPIRED,
      amount: restoredTotal.toString(),
      balanceAfter: wallet.balance,
      ticket,
      metadata: {
        originalDebitId: debit.id,
        restoredCredits: usedCredits,
        reason: 'ticket_expired',
      },
    });

    await walletRepo.save(wallet);
    await transactionRepo.save(debit);
    await transactionRepo.save(adjustment);
  }

  //* ============================================================================================== */
  //*                                   Get Available Balance                                        */
  //* ============================================================================================== */

  async getAvailableBalance(data: {
    customer: Customer;
    manager?: EntityManager;
  }): Promise<number> {
    const transactionRepo = this.getTransactionRepo(data.manager);
    const wallet = await this.getOrCreateWallet(data.customer, data.manager);

    /* await this.ticketExpirationService.expireTravelIfNeeded(
      dto.travelId,
      queryRunner.manager,
    ); */

    const credits = await transactionRepo.find({
      where: {
        wallet: { id: wallet.id },
        remainingAmount: MoreThan('0'),
        expiresAt: MoreThan(new Date()),
      },
      order: {
        expiresAt: 'ASC',
      },
    });

    let balance = 0;

    for (const credit of credits) {
      balance += Number(credit.remainingAmount);
    }

    return balance;
  }

  //* ============================================================================================== */
  //*                                    Get Transaction History                                     */
  //* ============================================================================================== */

  async getBalanceHistory(
    customer: Customer,
    pagination?: { page?: number; limit?: number },
    manager?: EntityManager,
  ) {
    const transactionRepo = this.getTransactionRepo(manager);
    const wallet = await this.getOrCreateWallet(customer, manager);

    const queryBuilder = transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId: wallet.id })
      .leftJoinAndSelect('transaction.ticket', 'ticket')
      .orderBy('transaction.createdAt', 'DESC');

    if (pagination?.page && pagination?.limit) {
      const skip = (pagination.page - 1) * pagination.limit;
      queryBuilder.skip(skip).take(pagination.limit);
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page: pagination?.page || 1,
      limit: pagination?.limit || 10,
    };
  }
}

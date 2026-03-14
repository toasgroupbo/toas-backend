import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, MoreThan, LessThan } from 'typeorm';

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
  //*                                Credit from Ticket Cancel QR                                    */
  //* ============================================================================================== */

  async creditFromTicketCancelQR(
    ticket: Ticket,
    customer: Customer,
    manager?: EntityManager,
  ) {
    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const wallet = await this.getOrCreateWallet(customer, manager);

    const amount = Number(ticket.total_price); //! solo el monto sin comision
    if (amount <= 0) return null;

    // Idempotencia
    const existingCredit = await transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        ticket: { id: ticket.id },
        type: TransactionType.CREDIT,
      },
    });

    if (existingCredit) {
      return existingCredit;
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
      ticket,
      metadata: {
        reason: 'ticket_cancelled_qr',
        originalTicketId: ticket.id,
        originalStatus: ticket.status,
        originalPaymentMethod: 'QR',
        cancelledAt: new Date().toISOString(),
      },
    });

    wallet.balance = newBalance.toString();

    await walletRepo.save(wallet);
    await transactionRepo.save(transaction);

    // Actualizar estado del QR
    if (ticket.paymentQr && manager) {
      const paymentQrRepo = manager.getRepository(PaymentQR);
      ticket.paymentQr.status = PaymentStatusEnum.CANCELLED;
      await paymentQrRepo.save(ticket.paymentQr);
    }

    return transaction;
  }

  //* ============================================================================================== */
  //*                    Credit from Ticket Cancel With Wallet                                       */
  //* ============================================================================================== */

  async creditFromTicketCancelWallet(
    ticket: Ticket,
    customer: Customer,
    manager?: EntityManager,
  ) {
    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const wallet = await this.getOrCreateWallet(customer, manager);

    // Buscar el DEBIT asociado a este ticket para saber cuánto se consumió
    const debit = await transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        ticket: { id: ticket.id },
        type: TransactionType.DEBIT,
      },
    });

    if (!debit) {
      // Si no hay DEBIT, no hay nada que devolver
      return null;
    }

    const amount = Number(debit.amount);
    if (amount <= 0) return null;

    // Verificar que no haya un CREDIT previo para este ticket (idempotencia)
    const existingCredit = await transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        ticket: { id: ticket.id },
        type: TransactionType.CREDIT,
        metadata: {
          reason: 'ticket_cancelled',
          originalTicketId: ticket.id,
          originalStatus: ticket.status,
        },
      },
    });

    if (existingCredit) {
      return existingCredit; // Ya se devolvió
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const currentBalance = Number(wallet.balance);
    const newBalance = currentBalance + amount;

    // Crear transacción CREDIT
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
        originalDebitId: debit.id,
        originalTicketId: ticket.id,
        originalStatus: ticket.status,
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

  async consumeForTicket(data: {
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

    /* const credits = await transactionRepo.find({
      where: {
        wallet: { id: wallet.id },
        remainingAmount: MoreThan('0'),
        expiresAt: MoreThan(new Date()),
      },
      order: {
        expiresAt: 'ASC', // FIFO: los que expiran primero
      },
    }); */

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
  }

  //* ============================================================================================== */
  //*                                    Expire Credits                                              */
  //* ============================================================================================== */

  async expireCredits(manager?: EntityManager) {
    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const expiredCredits = await transactionRepo.find({
      where: {
        remainingAmount: MoreThan('0'),
        expiresAt: LessThan(new Date()),
      },
      relations: { wallet: true },
    });

    for (const credit of expiredCredits) {
      const remaining = Number(credit.remainingAmount);
      const wallet = credit.wallet;

      const newBalance = Number(wallet.balance) - remaining;

      const expired = transactionRepo.create({
        wallet,
        type: TransactionType.EXPIRED,
        amount: remaining.toString(),
        balanceAfter: newBalance.toString(),
        metadata: {
          originalCreditId: credit.id,
          reason: 'credit_expired',
          expiredAt: new Date().toISOString(),
        },
      });

      credit.remainingAmount = '0';
      wallet.balance = newBalance.toString();

      await transactionRepo.save(credit);
      await walletRepo.save(wallet);
      await transactionRepo.save(expired);
    }
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

    // Buscar el DEBIT asociado a este ticket
    const debit = await transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        ticket: { id: ticket.id },
        type: TransactionType.DEBIT,
      },
    });

    if (!debit) return;

    // Verificar si ya se restauró (idempotencia)
    if (debit.metadata?.reversedAt) {
      return; // Ya se restauró
    }

    // Restaurar los créditos originales usando el metadata
    const usedCredits =
      (debit.metadata?.usedCredits as { creditId: number; amount: number }[]) ||
      [];

    for (const uc of usedCredits) {
      const originalCredit = await transactionRepo.findOne({
        where: { id: uc.creditId },
      });

      if (originalCredit) {
        const currentRemaining = Number(originalCredit.remainingAmount);
        originalCredit.remainingAmount = (
          currentRemaining + uc.amount
        ).toString();
        await transactionRepo.save(originalCredit);
      }
    }

    // Recalcular balance de la wallet (suma de créditos vigentes)
    const validCredits = await transactionRepo.find({
      where: {
        wallet: { id: wallet.id },
        type: TransactionType.CREDIT,
        remainingAmount: MoreThan('0'),
        expiresAt: MoreThan(new Date()),
      },
    });

    const newBalance = validCredits.reduce(
      (sum, credit) => sum + Number(credit.remainingAmount),
      0,
    );

    // Actualizar wallet y marcar débito como revertido
    wallet.balance = newBalance.toString();

    debit.metadata = {
      ...debit.metadata,
      reversedAt: new Date().toISOString(),
      reversedBecause: 'ticket_expired',
    };

    // Crear una transacción de ajuste para auditoría
    const adjustment = transactionRepo.create({
      wallet,
      type: TransactionType.EXPIRED,
      amount: debit.amount,
      balanceAfter: newBalance.toString(),
      ticket,
      metadata: {
        originalDebitId: debit.id,
        restoredCredits: usedCredits.map((uc) => ({
          creditId: uc.creditId,
          amount: uc.amount,
        })),
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

  async getAvailableBalance(
    customer: Customer,
    manager?: EntityManager,
  ): Promise<number> {
    const transactionRepo = this.getTransactionRepo(manager);
    const wallet = await this.getOrCreateWallet(customer, manager);

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

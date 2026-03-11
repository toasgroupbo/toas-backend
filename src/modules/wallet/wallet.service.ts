import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, MoreThan, LessThan } from 'typeorm';

import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  TransactionType,
} from './entities/wallet-transactions.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';

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
  //*                               Credit from Ticket Cancel                                        */
  //* ============================================================================================== */

  async creditFromTicketCancel(
    ticket: Ticket,
    customer: Customer,
    amount: number, // ← Recibimos el monto calculado
    manager?: EntityManager,
  ) {
    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const wallet = await this.getOrCreateWallet(customer, manager);

    if (amount <= 0) return null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newBalance = Number(wallet.balance) + amount;

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
        originalStatus: ticket.status,
        walletUsed: ticket.wallet_used,
        qrAmount: ticket.qr_amount,
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

  async consumeForTicket(
    customer: Customer,
    ticket: Ticket,
    amount: number,
    manager?: EntityManager,
  ): Promise<number> {
    if (amount <= 0) return 0;

    const walletRepo = this.getWalletRepo(manager);
    const transactionRepo = this.getTransactionRepo(manager);

    const wallet = await this.getOrCreateWallet(customer, manager);

    let remaining = amount;
    const usedCredits: { creditId: number; amount: number }[] = []; // ← NUEVO

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

    for (const credit of credits) {
      if (remaining <= 0) break;

      const creditRemaining = Number(credit.remainingAmount);
      const used = Math.min(creditRemaining, remaining);

      credit.remainingAmount = (creditRemaining - used).toString();
      await transactionRepo.save(credit);

      usedCredits.push({
        // ← GUARDAR
        creditId: credit.id,
        amount: used,
      });

      remaining -= used;
    }

    const usedTotal = amount - remaining;

    if (usedTotal > 0) {
      const newBalance = Number(wallet.balance) - usedTotal;

      const debit = transactionRepo.create({
        wallet,
        type: TransactionType.DEBIT,
        amount: usedTotal.toString(),
        balanceAfter: newBalance.toString(),
        ticket,
        metadata: {
          // ← NUEVO: guardar qué créditos se consumieron
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

    const amount = Number(ticket.wallet_used);
    if (amount <= 0) return;

    const wallet = await this.getOrCreateWallet(ticket.buyer, manager);

    // ============================================================
    // 1. Buscar el DEBIT asociado a este ticket
    // ============================================================
    const debit = await transactionRepo.findOne({
      where: {
        wallet: { id: wallet.id },
        ticket: { id: ticket.id },
        type: TransactionType.DEBIT,
      },
    });

    if (!debit) return;

    // ============================================================
    // 2. Restaurar los créditos originales usando el metadata
    // ============================================================
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

    // ============================================================
    // 3. Recalcular balance de la wallet (suma de créditos vigentes)
    // ============================================================
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

    // ============================================================
    // 4. Actualizar wallet y marcar débito como revertido
    // ============================================================
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
      amount: amount.toString(),
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
}

/* 

    // Validar saldo disponible ANTES de consumir
    /* const availableBalance = await this.getAvailableBalance(customer, manager);
  if (availableBalance < amount) {
    throw new BadRequestException(
      `Insufficient wallet balance. Available: ${availableBalance.toFixed(2)}, Required: ${amount.toFixed(2)}`,
    );
  } */

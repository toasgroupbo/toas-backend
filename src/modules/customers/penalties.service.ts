import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Penalty } from './entities/penalty.entity';
import { Customer } from './entities/customer.entity';

const MAX_FAILED = 4;
const WINDOW_HOURS = 24;
const BLOCK_HOURS = 24;

@Injectable()
export class PenaltiesService {
  constructor(
    @InjectRepository(Penalty)
    private readonly penaltyRepository: Repository<Penalty>,
  ) {}

  // -------------------------------
  // VALIDAR antes de reservar
  // -------------------------------
  async validateReservation(customer: Customer) {
    const penalty = await this.getOrCreate(customer);
    const now = new Date();

    if (penalty.blockedUntil && penalty.blockedUntil > now) {
      throw new ForbiddenException(
        `Client penalized up to ${penalty.blockedUntil /* .toISOString() */}`,
      );
    }
  }

  // -------------------------------
  // REGISTRAR cancelación o expiración
  // -------------------------------
  async registerFailure(customer: Customer, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Penalty)
      : this.penaltyRepository;

    const penalty = await this.getOrCreate(customer, manager);
    const now = new Date();

    // ¿La ventana ya venció?
    if (
      !penalty.windowStartedAt ||
      this.isWindowExpired(penalty.windowStartedAt, now)
    ) {
      penalty.failedCount = 0;
      penalty.windowStartedAt = now;
      penalty.blockedUntil = null;
    }

    penalty.failedCount += 1;

    // ¿Llega al límite?
    if (penalty.failedCount >= MAX_FAILED) {
      penalty.blockedUntil = this.addHours(now, BLOCK_HOURS);
    }

    await repository.save(penalty);
  }

  // -------------------------------
  // Helpers
  // -------------------------------
  private async getOrCreate(customer: Customer, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Penalty)
      : this.penaltyRepository;

    let penalty = await repository.findOne({
      where: { customer: { id: customer.id } },
    });

    if (!penalty) {
      penalty = repository.create({
        customer,
        failedCount: 0,
        windowStartedAt: new Date(),
      });
      await repository.save(penalty);
    }

    return penalty;
  }

  private isWindowExpired(start: Date, now: Date): boolean {
    return now.getTime() - start.getTime() > WINDOW_HOURS * 60 * 60 * 1000;
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }
}

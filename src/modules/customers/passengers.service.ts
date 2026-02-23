import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Customer } from './entities/customer.entity';
import { Passenger } from './entities/passenger.entity';

@Injectable()
export class PassengersService {
  constructor(
    @InjectRepository(Passenger)
    private readonly passengerRepository: Repository<Passenger>,
  ) {}

  //? ============================================================================================== */
  //?                                   Create_Base                                                  */
  //? ============================================================================================== */

  async createBase(
    dto: { fullName: string; ci: string },
    customer: Customer,
    manager?: EntityManager,
  ): Promise<Passenger> {
    const repository = manager
      ? manager.getRepository(Passenger)
      : this.passengerRepository;

    const entityManager = manager ?? repository.manager;

    try {
      // Buscar pasajero por CI

      let passenger = await repository.findOne({
        where: { ci: dto.ci },
        relations: { customers: true },
      });

      // Si ya existe
      if (passenger) {
        const alreadyLinked = passenger.customers?.some(
          (c) => c.id === customer.id,
        );

        if (!alreadyLinked) {
          passenger.customers = [...(passenger.customers || []), customer];

          await repository.save(passenger);
        }

        return passenger;
      }

      // Obtener passengers actuales del customer
      const customerWithPassengers = await entityManager.findOne(Customer, {
        where: { id: customer.id },
        relations: ['passengers'],
      });

      if (!customerWithPassengers) {
        throw new Error('Customer not found');
      }

      if (customerWithPassengers.passengers.length >= 10) {
        // eliminar SOLO la relación más antigua (no el pasajero)
        const oldestPassenger = customerWithPassengers.passengers.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        )[0];

        customerWithPassengers.passengers =
          customerWithPassengers.passengers.filter(
            (p) => p.id !== oldestPassenger.id,
          );

        await entityManager.save(Customer, customerWithPassengers);
      }

      // Crear nuevo pasajero
      passenger = repository.create({
        ...dto,
        customers: [customer],
      });

      return await repository.save(passenger);
    } catch (error) {
      handleDBExceptions(error);
      throw error;
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findOne(ci: string) {
    const passenger = await this.passengerRepository.findOne({
      where: { ci },
    });
    if (!passenger) throw new NotFoundException('Passenger not found');

    return passenger;
  }

  //? ============================================================================================== */

  async findAllInApp(customer: Customer) {
    return this.passengerRepository.find({
      where: { customers: customer },
    });
  }
}

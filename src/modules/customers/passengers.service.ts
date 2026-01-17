import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

  async createBase(dto: { fullName: string; ci: string }, customer: Customer) {
    try {
      const exists = await this.passengerRepository.findOne({
        where: {
          fullName: dto.fullName,
          ci: dto.ci,
          customer: { id: customer.id },
        },
      });

      if (exists) {
        return exists;
      }

      const passengers = await this.passengerRepository.find({
        where: { customer: { id: customer.id } },
        order: { createdAt: 'ASC' },
      });

      if (passengers.length >= 10) {
        await this.passengerRepository.remove(passengers[0]);
      }

      const passenger = this.passengerRepository.create({
        ...dto,
        customer,
      });

      return await this.passengerRepository.save(passenger);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAllInOffice(customerId: number) {
    return this.passengerRepository.find({
      where: { customer: { id: customerId } },
    });
  }

  //? ============================================================================================== */

  async findAllInApp(customer: Customer) {
    return this.passengerRepository.find({
      where: { customer: { id: customer.id } },
    });
  }
}

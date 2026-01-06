import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreatePassengerInAppDto, CreatePassengerInOfficeDto } from './dto';

import { Customer } from './entities/customer.entity';
import { Passenger } from './entities/passenger.entity';

@Injectable()
export class PassengersService {
  constructor(
    @InjectRepository(Passenger)
    private readonly passengerRepository: Repository<Passenger>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  //? ============================================================================================== */
  //?                                Create_In-Office                                                */
  //? ============================================================================================== */

  async createInOffice(dto: CreatePassengerInOfficeDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.createBase(dto, customer);
  }
  //? ============================================================================================== */
  //?                                  Create_In-App                                                 */
  //? ============================================================================================== */

  async createInApp(dto: CreatePassengerInAppDto, customer: Customer) {
    if (!(customer instanceof Customer)) {
      throw new BadRequestException(
        'Only customers can create Passengers in App',
      );
    }
    return this.createBase(dto, customer);
  }

  //? ============================================================================================== */
  //?                                   Create_Base                                                  */
  //? ============================================================================================== */

  private async createBase(
    dto: { fullName: string; ci: string },
    customer: Customer,
  ) {
    try {
      // Evitar duplicados
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

      // Obtener passengers actuales
      const passengers = await this.passengerRepository.find({
        where: { customer: { id: customer.id } },
        order: { createdAt: 'ASC' },
      });

      // Límite 10
      if (passengers.length >= 10) {
        await this.passengerRepository.remove(passengers[0]);
      }

      // Crear nuevo
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
  //?                              FindAll_In-Office                                                 */
  //? ============================================================================================== */

  async findAllPassengersInOffice(customerId: number) {
    return this.passengerRepository.find({
      where: { customer: { id: customerId } },
    });
  }

  //? ============================================================================================== */
  //?                                 FindAll_In-App                                                 */
  //? ============================================================================================== */

  async findAllPassengersInApp(customer: Customer) {
    if (!(customer instanceof Customer)) {
      throw new BadRequestException('Only customers can get Passengers in App');
    }

    return this.passengerRepository.find({
      where: { customer: { id: customer.id } },
    });
  }
}

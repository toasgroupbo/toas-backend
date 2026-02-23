import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import {
  CreateCustomerNotVerifiedDto,
  CreatePassengerInOfficeDto,
} from './dto';

import { Customer } from './entities/customer.entity';
import { PassengersService } from './passengers.service';

@Injectable()
export class CustomersForCashierService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    private readonly passengersService: PassengersService,
  ) {}

  //? ============================================================================================== */
  //?                                         Create                                                 */
  //? ============================================================================================== */

  async createNotVerified(
    createCustomerNotVerifiedDto: CreateCustomerNotVerifiedDto,
  ) {
    try {
      const newCustomer = this.customerRepository.create(
        createCustomerNotVerifiedDto,
      );

      return await this.customerRepository.save(newCustomer);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOneByCi(ci: string) {
    const customer = await this.customerRepository.findOne({ where: { ci } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  //? ============================================================================================== */
  //?                                Create_Passenger                                                */
  //? ============================================================================================== */

  /* async createPassenger(dto: CreatePassengerInOfficeDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.passengersService.createBase(dto, customer);
  } */

  //? ============================================================================================== */
  //?                              FindOne_Passengers                                                */
  //? ============================================================================================== */

  async findOne(ci: string) {
    return this.passengersService.findOne(ci);
  }
}

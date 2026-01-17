import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreatePassengerInAppDto, UpdateCustomerDto } from './dto';

import { PassengersService } from './passengers.service';

import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersInAppService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    private readonly passengersService: PassengersService,
  ) {}

  //? ============================================================================================== */
  //?                                        Me                                                      */
  //? ============================================================================================== */

  async me(customer: Customer) {
    const customerEntity = await this.customerRepository.findOne({
      where: { id: customer.id },
      relations: { billing: true },
    });

    if (!customerEntity) {
      throw new NotFoundException('Customer not found');
    }

    return customerEntity;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(customer: Customer, updateCustomerDto: UpdateCustomerDto) {
    const customerEntity = await this.findOne(customer.id);

    try {
      Object.assign(customerEntity, updateCustomerDto);
      return await this.customerRepository.save(customerEntity);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //* ============================================================================================== */

  private async findOne(id: number) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  //? ============================================================================================== */
  //?                                 Get_Penalities                                                 */
  //? ============================================================================================== */

  async getPenalities(customer: Customer) {
    const customerEntity = await this.customerRepository.findOne({
      where: { id: customer.id },
      relations: { penalty: true },
    });

    if (!customerEntity) throw new NotFoundException('Customer not found');

    return customerEntity.penalty;
  }

  //? ============================================================================================== */
  //?                               Create_Passenger                                                 */
  //? ============================================================================================== */

  async createPassenger(dto: CreatePassengerInAppDto, customer: Customer) {
    return this.passengersService.createBase(dto, customer);
  }

  //? ============================================================================================== */
  //?                              FindAll_Passengers                                                */
  //? ============================================================================================== */

  async findAllPassengers(customer: Customer) {
    return this.passengersService.findAllInApp(customer);
  }
}

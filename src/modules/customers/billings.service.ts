import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateOrUpdateBillingDto } from './dto';

import { Billing } from './entities/billing.entity';
import { Customer } from './entities/customer.entity';

@Injectable()
export class BillingsService {
  constructor(
    @InjectRepository(Billing)
    private readonly billingRepository: Repository<Billing>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  //? ============================================================================================== */
  //?                              Create_Or_Update                                                  */
  //? ============================================================================================== */
  async createOrUpdateBilling(
    customer: Customer,
    dto: CreateOrUpdateBillingDto,
  ) {
    try {
      const customerEntity = await this.customerRepository.findOne({
        where: { id: customer.id },
        relations: { billing: true },
      });

      if (!customerEntity) throw new Error('Customer not found');

      //! Si ya tiene billing lo actualiza
      if (customerEntity.billing) {
        customerEntity.billing.nombre = dto.nombre;
        customerEntity.billing.ci = dto.ci;

        await this.billingRepository.save(customerEntity.billing);
        return customerEntity.billing;
      }

      //! Si no tiene billing lo crea
      const newBilling = this.billingRepository.create(dto);
      customerEntity.billing = newBilling;

      return await this.customerRepository.save(customerEntity);
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}

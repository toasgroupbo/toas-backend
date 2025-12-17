import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { CustomerPaginationDto } from './pagination/customer-pagination.dto';
import { UpdateCustomerDto, CreateCustomerNotVerifiedDto } from './dto';
import { paginate } from 'src/common/pagination/paginate';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                         Create                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createCustomerNotVerifiedDto: CreateCustomerNotVerifiedDto) {
    try {
      const newCustomer = await this.customerRepository.create(
        createCustomerNotVerifiedDto,
      );

      return await this.customerRepository.save(newCustomer);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(pagination: CustomerPaginationDto) {
    const options: any = {
      where: {},
    };

    if ('is_verified' in pagination) {
      options.where.is_verified = pagination.is_verified;
    }

    return paginate(this.customerRepository, options, pagination, [
      'name',
      'email',
    ]);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Customer)
      : this.customerRepository;

    const customer = await repository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findOneByCi(ci: string) {
    const customer = await this.customerRepository.findOne({ where: { ci } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                    FindOneByEmail                                              */
  //? ---------------------------------------------------------------------------------------------- */

  async findOneByEmail(email: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { email },
      select: { password: true, id: true, email: true, name: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 FindOneByEmail                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOneByEmailLogin(email: string) {
    const customer = await this.customerRepository.findOneBy({ email });
    return customer;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.findOne(id);
    try {
      Object.assign(customer, updateCustomerDto);
      return await this.customerRepository.save(customer);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string) {
    const customer = await this.findOne(id);

    try {
      await this.customerRepository.softRemove(customer);
      return {
        message: 'Customer deleted successfully',
        deleted: customer,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}

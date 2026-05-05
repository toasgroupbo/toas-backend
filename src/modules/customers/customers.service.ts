import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { paginate } from 'src/common/pagination/paginate';
import { CustomerPaginationDto } from './pagination/customer-pagination.dto';

import { WalletService } from '../wallet/wallet.service';

import { Customer } from './entities/customer.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    private readonly walletService: WalletService,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(pagination: CustomerPaginationDto) {
    const options: any = {
      where: {},
      select: {
        id: true,
        ci: true,
        email: true,
        name: true,
        is_verified: true,
        birthDate: true,
        billingObject: true,
        createdAt: true,
      },
    };

    if ('is_verified' in pagination) {
      options.where.is_verified = pagination.is_verified;
    }

    const result = await paginate(
      this.customerRepository,
      options,
      pagination,
      ['name', 'email'],
    );

    const dataWithExtras = await Promise.all(
      result.data.map(async (customer) => {
        const [balance, ticketsCount] = await Promise.all([
          this.walletService.getAvailableBalance({ customer }),

          this.ticketRepository.count({
            where: {
              buyer: { id: customer.id },
            },
          }),
        ]);

        return {
          ...customer,
          ticketsBought: ticketsCount,
          availableBalance: balance,
        };
      }),
    );

    const allCustomers = await this.customerRepository.find();

    //! balance total
    const balances = await Promise.all(
      allCustomers.map((customer) =>
        this.walletService.getAvailableBalance({ customer }),
      ),
    );
    const totalBalance = balances.reduce((sum, b) => sum + b, 0);

    return {
      ...result,
      totalBalance,
      data: dataWithExtras,
    };
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number) {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  //? ============================================================================================== */

  async findOneFull(id: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Customer)
      : this.customerRepository;

    const customer = await repository.findOne({
      where: { id },
      relations: { ticketsBought: true },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const balance = await this.walletService.getAvailableBalance({
      customer,
      manager,
    });

    return {
      ...customer,
      availableBalance: balance,
    };
  }

  //? ============================================================================================== */

  async findOneForLogin(id: number) {
    const customer = await this.customerRepository.findOne({
      where: { id },
      select: {
        id: true,
        sessionToken: true,
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  //? ============================================================================================== */

  async findOneByEmail(email: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { email },
      select: { id: true, email: true, name: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  //? ============================================================================================== */

  async findOneByEmailLogin(email: string) {
    const customer = await this.customerRepository.findOneBy({ email });
    return customer;
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number) {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: { ticketsBought: true },
    });

    if (!customer) throw new NotFoundException('Customer not found');

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

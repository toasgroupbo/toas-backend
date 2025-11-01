import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { BankAccount } from './entities/bank-account.entity';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createBankAccountDto: CreateBankAccountDto) {
    try {
      const newBankAccount =
        this.bankAccountRepository.create(createBankAccountDto);
      return await this.bankAccountRepository.save(newBankAccount);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(pagination: PaginationDto) {
    //const { limit = 10, offset = 0 } = pagination;

    const bankAccounts = await this.bankAccountRepository.find({
      //take: limit,
      //skip: offset,
    });
    return bankAccounts;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string) {
    const bankAccount = await this.bankAccountRepository.findOne({
      where: { id },
    });

    if (!bankAccount) throw new NotFoundException('Bank Account not found');

    return bankAccount;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateBankAccountDto: UpdateBankAccountDto) {
    const bankAccount = await this.findOne(id);
    try {
      Object.assign(bankAccount, updateBankAccountDto);
      return await this.bankAccountRepository.save(bankAccount);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string) {
    const bankAccount = await this.findOne(id);
    try {
      await this.bankAccountRepository.softRemove(bankAccount);
      return {
        message: 'Bank Account deleted successfully',
        deleted: bankAccount,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}

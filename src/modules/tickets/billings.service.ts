import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { BillingDto } from './dto';

import { Billing } from './entities/billing.entity';

@Injectable()
export class BillingsService {
  constructor(
    @InjectRepository(Billing)
    private readonly billingRepository: Repository<Billing>,
  ) {}

  //? ============================================================================================== */
  //?                              Create_Or_Update                                                  */
  //? ============================================================================================== */

  async createOrUpdateBilling(
    dto: BillingDto,
    manager?: EntityManager,
  ): Promise<Billing> {
    const repo = manager
      ? manager.getRepository(Billing)
      : this.billingRepository;

    try {
      let billing = await repo.findOne({
        where: { ci: dto.ci },
      });

      if (billing) {
        billing = repo.merge(billing, dto);
      } else {
        billing = repo.create(dto);
      }

      return await repo.save(billing);
    } catch (error) {
      handleDBExceptions(error);
      throw error;
    }
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  async FindOne(ci: string) {
    return await this.billingRepository.findOneBy({ ci });
  }
}

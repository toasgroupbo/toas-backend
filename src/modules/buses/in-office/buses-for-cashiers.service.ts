import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Bus } from '../entities/bus.entity';
import { Office } from 'src/modules/offices/entities/office.entity';

@Injectable()
export class BusesForCashierService {
  constructor(
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(office: Office) {
    const buses = await this.busRepository.find({
      where: {
        company: { id: office.company.id },
        enabled: true,
      },
      relations: { owner: true, busType: true },
    });
    return buses;
  }
}

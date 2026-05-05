import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateCommissionDto } from './dto/update-commission.dto';

import { Commission } from './entities/commission.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Company } from '../companies/entities/company.entity';
import { TravelStatus } from '../travels/enums';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const companies = await this.companyRepository.find();

    for (const company of companies) {
      const existing = await this.commissionRepository.findOne({
        where: {
          company: { id: company.id },
          period_key: periodKey,
        },
      });

      if (existing) {
        console.log(
          `Comisión ya existe para empresa ${company.id} en ${periodKey}`,
        );
        continue;
      }

      const result = await this.travelRepository
        .createQueryBuilder('travel')
        .select('COUNT(travel.id)', 'total_trips_count')
        .select('SUM(travel.tickets_app_count)', 'tickets_app_count_total')
        .addSelect('SUM(travel.total_commission)', 'commission_app_total')
        .where('travel.companyId = :companyId', { companyId: company.id })
        .andWhere('travel.departure_time >= :start', { start })
        .andWhere('travel.departure_time < :end', { end })
        .andWhere('travel.deletedAt IS NULL')
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.CLOSED,
        })
        .getRawOne();

      const totalTrips = Number(result?.total_trips_count || 0);

      console.log(totalTrips);

      const ticketsApp = Number(result?.tickets_app_count_total || 0);
      const commissionApp = Number(result?.commission_app_total || 0);
      const commissionRateAtTime = company.commission;
      const commissionCompanyNumber =
        (commissionApp * commissionRateAtTime) / 100;
      const commissionCompanyString = commissionCompanyNumber.toFixed(2);

      const commission = this.commissionRepository.create({
        company,
        total_trips_count: totalTrips,
        tickets_app_count_total: ticketsApp,
        commission_app_total: commissionApp.toFixed(2),
        commission_rate_at_time: commissionRateAtTime,
        commission_company: commissionCompanyString,
        date_to_pay: end,
        period_start: start,
        period_end: end,
        period_key: periodKey,
        paid: '0',
      });

      await this.commissionRepository.save(commission);
    }
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  findAll() {
    return `This action returns all commissions`;
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  findOne(id: number) {
    return `This action returns a #${id} commission`;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  update(id: number, updateCommissionDto: UpdateCommissionDto) {
    return `This action updates a #${id} commission`;
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateCommissionDto {
  tickets_app_count_total: number;

  commission_app_total: string;

  commission_company: number;

  date_to_pay: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ApiProperty({
    description: 'Company Id',
    example: 1,
  })
  @IsNumber()
  companyId: number;
}

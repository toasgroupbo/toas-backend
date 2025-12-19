import { Controller } from '@nestjs/common';
import { BalancesService } from './balances.service';

@Controller('balance')
export class BalancesController {
  constructor(private readonly balanceService: BalancesService) {}
}

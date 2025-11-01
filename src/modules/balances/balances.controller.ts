import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BalancesService } from './balances.service';

@Controller('balance')
export class BalancesController {
  constructor(private readonly balanceService: BalancesService) {}
}

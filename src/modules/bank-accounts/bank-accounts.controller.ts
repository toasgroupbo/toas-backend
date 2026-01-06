import {
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UpdateBankAccountDto } from './dto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, Resource } from 'src/auth/decorators';

import { BankAccountsService } from './bank-accounts.service';

//!
@Resource(ValidResourses.BANK_ACCOUNT)
@ApiBearerAuth('access-token')
//!

@ApiTags('Bank Accounts')
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  /*//!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountsService.create(createBankAccountDto);
  }*/

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.bankAccountsService.findAll(pagination);
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bankAccountsService.findOne(id);
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.bankAccountsService.update(id, updateBankAccountDto);
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bankAccountsService.remove(id);
  }
}

import { Get, Post, Body, Patch, Param, Controller } from '@nestjs/common';

import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

import { CommissionsService } from './commissions.service';

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  @Post()
  create() {
    return this.commissionsService.create();
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  @Get()
  findAll() {
    return this.commissionsService.findAll();
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commissionsService.findOne(+id);
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCommissionDto: UpdateCommissionDto,
  ) {
    return this.commissionsService.update(+id, updateCommissionDto);
  }
}

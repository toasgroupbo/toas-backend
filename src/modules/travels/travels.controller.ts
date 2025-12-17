import {
  Get,
  Post,
  Body,
  Param,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateTravelDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import {
  Auth,
  GetCompany,
  GetOffice,
  GetUser,
  Resource,
} from 'src/auth/decorators';

import { TravelsService } from './travels.service';
import { Office } from '../offices/entities/office.entity';

//!
@Resource(ValidResourses.TRAVEL)
@ApiBearerAuth('access-token')
//!

@ApiTags('Travels')
@Controller('travels')
export class TravelsController {
  constructor(private readonly travelsService: TravelsService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() createTravelDto: CreateTravelDto) {
    return this.travelsService.create(createTravelDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                           Get_Seats_Available                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('seats-available:id')
  getSeatsAvailable(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.getSeatsAvailable(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 Closed_Travel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CLOSE)
  //!
  closed() {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Get()
  findAll(@GetCompany() companyUUID: string) {
    return this.travelsService.findAll(companyUUID); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Resource(ValidResourses.CASHIER_TRAVEL)
  @Auth(ValidPermissions.READ)
  @ApiBearerAuth('access-token')
  //!
  @Get('cashier')
  findAllTravelsforCashier(@GetOffice() office: Office) {
    return this.travelsService.findAllForCashier(office); //! GetOffice object
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCompany() companyUUID: string,
  ) {
    return this.travelsService.findOne(id, companyUUID); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Cancel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CANCEL)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Post('cancel/:id')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCompany() companyUUID: string,
  ) {
    return this.travelsService.cancel(id, companyUUID); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCompany() companyUUID: string,
  ) {
    return this.travelsService.remove(id, companyUUID); //! GetCompany
  }
}

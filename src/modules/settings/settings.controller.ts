import { Controller, Get, Post, Body, Patch } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  /*   @Post()
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  } */

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  @Get()
  findOne() {
    return this.settingsService.findOne();
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  @Patch()
  update(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(updateSettingDto);
  }
}

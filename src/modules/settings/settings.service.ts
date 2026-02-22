import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(dto: CreateSettingDto) {
    try {
      const newSetting = this.settingRepository.create(dto);
      return await this.settingRepository.save(newSetting);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findOne() {
    const setting = await this.settingRepository.find();
    return setting[0];
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(dto: UpdateSettingDto) {
    const setting = await this.findOne();

    try {
      Object.assign(setting, dto);
      return await this.settingRepository.save(setting);
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}

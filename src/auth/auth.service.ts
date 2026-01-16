import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { IJwtPayload } from './interfaces/jwt-payload.interface';
import { LoginUserDto } from './dto';
import * as bcrypt from 'bcrypt';

import { CreateCustomerDto } from 'src/modules/customers/dto';

import { LoginType } from '../common/enums/login-type.enum';

import { IGooglePayload } from './interfaces';

import { UsersService } from '../modules/users/users.service';

import { Customer } from '../modules/customers/entities/customer.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  //? ============================================================================================== */
  //?                              SignIn_Customer                                                   */
  //? ============================================================================================== */

  async signIn(GooglePayload: IGooglePayload) {
    if (!GooglePayload) {
      throw new BadRequestException('Unauthenticated');
    }

    const customer = await this.findCustomerByEmail(GooglePayload.email);

    if (!customer) {
      return await this.registerCustomer(GooglePayload);
    }

    return {
      token: this.generateJwt({
        id: customer.id,
        type: LoginType.customer,
      }),
    };
  }

  //? ============================================================================================== */
  //?                                   Login_User                                                   */
  //? ============================================================================================== */

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...entityWithoutPassword } = user;

    return {
      user: entityWithoutPassword,
      token: this.generateJwt({
        id: entityWithoutPassword.id,
        type: LoginType.user,
      }),
    };
  }

  //? ============================================================================================== */
  //?                               Register_Customer                                                */
  //? ============================================================================================== */

  async registerCustomer(createCustomerDto: CreateCustomerDto) {
    try {
      const newCustomer = this.customerRepository.create({
        ...createCustomerDto,
        is_verified: true,
      });
      const customer = await this.customerRepository.save(newCustomer);

      return {
        token: this.generateJwt({
          id: customer.id,
          type: LoginType.customer,
        }),
      };
    } catch (error) {
      console.log(error);
    }
  }

  //? ============================================================================================== */
  //?                                  Login_Customer                                                */
  //? ============================================================================================== */

  async loginCustomer(email: string) {
    const customer = await this.customerRepository.findOneBy({ email });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      token: this.generateJwt({
        id: customer.id,
        type: LoginType.customer,
      }),
    };
  }

  //* ============================================================================================== */

  private async findCustomerByEmail(email: string) {
    const customer = await this.customerRepository.findOneBy({ email });
    if (!customer) {
      return null;
    }
    return customer;
  }

  //* ============================================================================================== */

  private generateJwt(JwtPayload: IJwtPayload) {
    return this.jwtService.sign(JwtPayload);
  }
}

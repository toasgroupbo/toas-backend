import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { IJwtPayload } from './interfaces/jwt-payload.interface';
import { LoginUserDto } from './dto';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../modules/users/users.service';

import { CreateCustomerDto } from 'src/modules/customers/dto';

import { LoginType } from '../common/enums/login-type.enum';
import { IGooglePayload } from './interfaces';

import { Customer } from '../modules/customers/entities/customer.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                               SignInCustomer                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  async signIn(GooglePayload: IGooglePayload) {
    if (!GooglePayload) {
      throw new BadRequestException('Unauthenticated');
    }

    const customerEntity = await this.findCustomerByEmail(GooglePayload.email);

    if (!customerEntity) {
      return await this.registerCustomer(GooglePayload);
    }

    return {
      token: this.generateJwt({
        id: customerEntity.id,
        email: customerEntity.email,
        type: LoginType.customer,
      }),
    };
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                   Login User                                                   */
  //? ---------------------------------------------------------------------------------------------- */

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
        email: entityWithoutPassword.email,
        type: LoginType.user,
      }),
    };
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                RegisterCustomer                                                */
  //? ---------------------------------------------------------------------------------------------- */

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
          email: customer.email,
          type: LoginType.customer,
        }),
      };
    } catch (error) {
      console.log(error);
    }
  }

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */

  async findCustomerByEmail(email: string) {
    const customer = await this.customerRepository.findOneBy({ email });
    if (!customer) {
      return null;
    }
    return customer;
  }

  generateJwt(JwtPayload: IJwtPayload) {
    return this.jwtService.sign(JwtPayload);
  }
}

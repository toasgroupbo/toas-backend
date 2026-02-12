import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { OAuth2Client } from 'google-auth-library';

import { IJwtPayload } from './interfaces/jwt-payload.interface';
import { LoginCustomerDto, LoginUserDto } from './dto';
import * as bcrypt from 'bcrypt';

import { CreateCustomerDto } from 'src/modules/customers/dto';

import { LoginType } from '../common/enums/login-type.enum';

import { IGooglePayload } from './interfaces';

import { UsersService } from '../modules/users/users.service';

import { Customer } from '../modules/customers/entities/customer.entity';

import { envs } from 'src/config/environments/environments';
import { AuthProviders } from './enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  private googleClient = new OAuth2Client(envs.GOOGLE_ID_OAUTH);

  //? ============================================================================================== */
  //?                              SignIn_Customer                                                   */
  //? ============================================================================================== */

  /* async signIn(GooglePayload: IGooglePayload) {
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
  } */

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

  /* async registerCustomer(createCustomerDto: CreateCustomerDto) {
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
  } */

  //? ============================================================================================== */
  //?                                   Google_Verify                                                */
  //? ============================================================================================== */

  async googleVerify(idToken: string) {
    if (!idToken) {
      throw new BadRequestException('Missing idToken');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: envs.GOOGLE_ID_OAUTH,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const {
      sub,
      email,
      email_verified,
      name,
      given_name,
      family_name,
      picture,
    } = payload;

    if (!email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    if (!email) {
      throw new UnauthorizedException('Email not Found');
    }

    let customer = await this.findCustomerByEmail(email);

    if (!customer) {
      customer = await this.customerRepository.save(
        this.customerRepository.create({
          email,
          name,
          provider: AuthProviders.GOOGLE,
          idProvider: sub,
          is_verified: true,
        }),
      );
    }

    return {
      token: this.generateJwt({
        id: customer.id,
        type: LoginType.customer,
      }),
      user: customer,
    };
  }

  //? ============================================================================================== */
  //?                                  Login_Customer                                                */
  //? ============================================================================================== */

  /* async loginCustomer(dto: LoginCustomerDto) {
    const customer = await this.customerRepository.findOneBy({
      email: dto.email,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      token: this.generateJwt({
        id: customer.id,
        type: LoginType.customer,
      }),
    };
  } */

  async loginCustomer(dto: LoginCustomerDto) {
    const { email, password } = dto;

    const customer = await this.customerRepository.findOneBy({
      email,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.password) {
      throw new NotFoundException('Customer Without Password');
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...entityWithoutPassword } = customer;

    return {
      customer: entityWithoutPassword,
      token: this.generateJwt({
        id: entityWithoutPassword.id,
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

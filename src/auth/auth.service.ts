import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { OAuth2Client } from 'google-auth-library';

import { IJwtPayload } from './interfaces/jwt-payload.interface';
import { AppleLoginDto, LoginCustomerDto, LoginUserDto } from './dto';
import * as bcrypt from 'bcrypt';

import { envs } from 'src/config/environments/environments';

import { AuthProviders } from './enums';
import { LoginType } from '../common/enums/login-type.enum';

import { UsersService } from '../modules/users/users.service';
import { AppleAuthService } from './services/apple-auth.service';

import { User } from 'src/modules/users/entities/user.entity';
import { Customer } from '../modules/customers/entities/customer.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    private readonly jwtService: JwtService,
    private readonly userService: UsersService,

    private readonly appleAuthService: AppleAuthService,
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

    //!

    // Generar nuevo token
    const token = this.generateJwt({
      id: entityWithoutPassword.id,
      type: LoginType.user,
    });

    // Invalidar sesión anterior (si existe) guardando el nuevo token
    await this.userRepository.update(
      { id: entityWithoutPassword.id },
      { sessionToken: token },
    );

    return {
      user: entityWithoutPassword,
      token,
    };

    //!

    /* return {
      user: entityWithoutPassword,
      token: this.generateJwt({
        id: entityWithoutPassword.id,
        type: LoginType.user,
      }),
    }; */
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

    //!

    // Generar token
    const token = this.generateJwt({
      id: customer.id,
      type: LoginType.customer,
    });

    // Invalidar sesión anterior guardando el nuevo token
    await this.customerRepository.update(
      { id: customer.id },
      { sessionToken: token },
    );

    return {
      token,
      user: customer,
    };

    //!
    /* return {
      token: this.generateJwt({
        id: customer.id,
        type: LoginType.customer,
      }),
      user: customer,
    }; */
  }

  //? ============================================================================================== */
  //?                                    Apple_Verify                                                */
  //? ============================================================================================== */

  async appleVerify(dto: AppleLoginDto) {
    const { identityToken, fullName } = dto;

    if (!identityToken) {
      throw new BadRequestException('Missing identityToken');
    }

    // --------------------------------------------------
    // 1. Verificar token Apple
    // --------------------------------------------------
    const claims =
      await this.appleAuthService.verifyIdentityToken(identityToken);

    const { sub, email } = claims;

    if (!sub) {
      throw new UnauthorizedException('Invalid Apple token');
    }

    // --------------------------------------------------
    // 2. Buscar cliente existente por Apple ID
    // --------------------------------------------------
    let customer = await this.customerRepository.findOne({
      where: { idProvider: sub },
    });

    // --------------------------------------------------
    // 3. Crear cliente si no existe
    // --------------------------------------------------
    if (!customer) {
      customer = await this.customerRepository.save(
        this.customerRepository.create({
          email: email || '',
          name: fullName ?? `Apple User ${sub.slice(0, 6)}`,
          provider: AuthProviders.APPLE,
          idProvider: sub,
          is_verified: false,
        }),
      );
    }

    // --------------------------------------------------
    // 4. Completar datos faltantes si Apple los envía
    // --------------------------------------------------
    let shouldUpdate = false;

    if (!customer.email && email) {
      customer.email = email;
      shouldUpdate = true;
    }

    if (!customer.name && fullName) {
      customer.name = fullName;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      customer = await this.customerRepository.save(customer);
    }

    // --------------------------------------------------
    // 5. Generar JWT propio
    // --------------------------------------------------
    const token = this.generateJwt({
      id: customer.id,
      type: LoginType.customer,
    });

    // --------------------------------------------------
    // 6. Invalidar sesión previa
    // --------------------------------------------------
    await this.customerRepository.update(
      { id: customer.id },
      { sessionToken: token },
    );

    return {
      token,
      user: customer,
    };
  }

  //? ============================================================================================== */
  //?                                  Login_Customer                                                */
  //? ============================================================================================== */

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

    // Generar token
    const token = this.generateJwt({
      id: entityWithoutPassword.id,
      type: LoginType.customer,
    });

    // Invalidar sesión anterior guardando el nuevo token
    await this.customerRepository.update(
      { id: customer.id },
      { sessionToken: token },
    );

    return {
      customer: entityWithoutPassword,
      token,
    };

    /* return {
      customer: entityWithoutPassword,
      token: this.generateJwt({
        id: entityWithoutPassword.id,
        type: LoginType.customer,
      }),
    }; */
  }

  //? ============================================================================================== */
  //?                                        Logout                                                  */
  //? ============================================================================================== */

  async logout(user: User | Customer, userType: LoginType) {
    if (userType === LoginType.user) {
      await this.userRepository.update({ id: user.id }, { sessionToken: null });
    } else {
      await this.customerRepository.update(
        { id: user.id },
        { sessionToken: null },
      );
    }

    return {
      message: 'Sesión cerrada exitosamente',
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

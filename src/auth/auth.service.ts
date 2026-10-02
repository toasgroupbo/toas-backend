import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { authenticator } from 'otplib';

import { OAuth2Client } from 'google-auth-library';

import { IJwtPayload } from './interfaces/jwt-payload.interface';
import {
  AppleLoginDto,
  ForgotPasswordDto,
  LoginCustomerDto,
  LoginUserDto,
  RegisterCustomerDto,
  ResetPasswordDto,
  VerifyTwoFactorLoginDto,
} from './dto';

import { envs } from 'src/config/environments/environments';

import { AuthProviders } from './enums';
import { LoginType } from '../common/enums/login-type.enum';

import { UsersService } from '../modules/users/users.service';
import { AppleAuthService } from './services/apple-auth.service';
import { MailService } from 'src/mail/mail.service';

import { User } from 'src/modules/users/entities/user.entity';
import { Customer } from '../modules/customers/entities/customer.entity';

const PASSWORD_RESET_EXPIRES_MINUTES = 30;
const FORGOT_PASSWORD_MESSAGE =
  'If that email exists, a reset link has been sent';

//! TOTP compatible con Google Authenticator (SHA-1, 6 dígitos, 30 s).
//! window: 1 tolera ±30 s de desfase del reloj del celular (por defecto otplib v12 usa 0)
const totp = authenticator.clone({ window: 1 });
const TWO_FACTOR_ISSUER = 'Bus Express'; //! nombre que se ve en la app de Google Authenticator
const TWO_FACTOR_TEMP_TOKEN_EXPIRES_IN = '5m';

//! solo da lectura (rutas/viajes): un vencimiento largo evita renovaciones constantes en la app
const GUEST_TOKEN_EXPIRES_IN = '30d';

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

    private readonly mailService: MailService,
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

    //! con 2FA activo no se emite la sesión todavía: el front pide el código y llama a auth/login/2fa
    if (user.isTwoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        { id: user.id, type: LoginType.user, twoFactorPending: true },
        { expiresIn: TWO_FACTOR_TEMP_TOKEN_EXPIRES_IN },
      );

      return { twoFactorRequired: true, tempToken };
    }

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
  //?                                        Guest                                                   */
  //? ============================================================================================== */

  //! a diferencia de monero no usa un customer compartido: la sesión única (sessionToken)
  //! haría que cada invitado nuevo expulse al anterior. El token no tiene fila en BD
  getTokenGuest() {
    const token = this.jwtService.sign(
      { id: 0, type: LoginType.guest },
      { expiresIn: GUEST_TOKEN_EXPIRES_IN },
    );

    return { token, isGuest: true };
  }

  //? ============================================================================================== */
  //?                                   Login_2FA                                                    */
  //? ============================================================================================== */

  async verifyTwoFactorLogin(dto: VerifyTwoFactorLoginDto) {
    let payload: IJwtPayload;
    try {
      payload = this.jwtService.verify<IJwtPayload>(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.twoFactorPending || payload.type !== LoginType.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userService.findOneByIdWithTwoFactor(payload.id);

    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    if (!totp.verify({ token: dto.code, secret: user.twoFactorSecret })) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    const { twoFactorSecret: _, ...entityWithoutSecret } = user;

    const token = this.generateJwt({ id: user.id, type: LoginType.user });

    // Invalidar sesión anterior (si existe) guardando el nuevo token
    await this.userRepository.update({ id: user.id }, { sessionToken: token });

    return {
      user: entityWithoutSecret,
      token,
    };
  }

  //? ============================================================================================== */
  //?                                  2FA_Generate                                                  */
  //? ============================================================================================== */

  //! genera el secreto y el QR, pero no activa el 2FA hasta que el usuario confirme un código
  async generateTwoFactorSecret(userId: number, password: string) {
    //! pide la contraseña para que una sesión robada no pueda activar 2FA con otro celular
    await this.verifyUserPassword(userId, password);

    const user = await this.userService.findOneByIdWithTwoFactor(userId);

    //! sin esto se pisaría el secreto activo y la app del usuario dejaría de servir
    if (user.isTwoFactorEnabled) {
      throw new BadRequestException(
        '2FA is already enabled. Disable it before generating a new secret',
      );
    }

    const secret = totp.generateSecret(20);
    const otpauthUrl = totp.keyuri(user.email, TWO_FACTOR_ISSUER, secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    await this.userRepository.update(
      { id: user.id },
      { twoFactorSecret: secret },
    );

    return { qrCode, secret, otpauthUrl };
  }

  //? ============================================================================================== */
  //?                                   2FA_Enable                                                   */
  //? ============================================================================================== */

  async enableTwoFactor(userId: number, code: string) {
    const user = await this.userService.findOneByIdWithTwoFactor(userId);

    if (user.isTwoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Generate a 2FA secret first');
    }

    //! 400 y no 401: el usuario está logueado y un 401 haría que el front cierre su sesión
    if (!totp.verify({ token: code, secret: user.twoFactorSecret })) {
      throw new BadRequestException('Invalid 2FA code');
    }

    await this.userRepository.update(
      { id: user.id },
      { isTwoFactorEnabled: true },
    );

    return { message: '2FA enabled successfully' };
  }

  //? ============================================================================================== */
  //?                                  2FA_Disable                                                   */
  //? ============================================================================================== */

  //! exige el código (no solo la sesión) para que nadie lo desactive desde una sesión abierta ajena
  async disableTwoFactor(userId: number, code: string) {
    const user = await this.userService.findOneByIdWithTwoFactor(userId);

    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled');
    }

    if (!totp.verify({ token: code, secret: user.twoFactorSecret })) {
      throw new BadRequestException('Invalid 2FA code');
    }

    await this.userRepository.update(
      { id: user.id },
      { isTwoFactorEnabled: false, twoFactorSecret: null },
    );

    return { message: '2FA disabled successfully' };
  }

  //? ============================================================================================== */
  //?                                 Forgot_Password                                                */
  //? ============================================================================================== */

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOneBy({
      email: dto.email,
      enabled: true,
    });

    //! no revelar si el email existe o no
    if (!user) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000,
    );

    // Un nuevo pedido reemplaza al token anterior (solo el último link sirve)
    await this.userRepository.update(
      { id: user.id },
      {
        passwordResetToken: this.hashResetToken(rawToken),
        passwordResetExpiresAt: expiresAt,
      },
    );

    const resetLink = `${envs.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    //! sin await: la respuesta tarda lo mismo exista o no el email
    this.mailService
      .sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetLink,
        expiresInMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
      })
      .catch((error) =>
        console.error(
          `[FORGOT_PASSWORD] Error sending reset email to user ${user.id}`,
          error,
        ),
      );

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  //? ============================================================================================== */
  //?                                  Reset_Password                                                */
  //? ============================================================================================== */

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, enabled: true },
      select: {
        id: true,
        passwordResetToken: true,
        passwordResetExpiresAt: true,
      },
    });

    const tokenHash = this.hashResetToken(dto.token);

    const isValid =
      !!user &&
      user.passwordResetToken === tokenHash &&
      !!user.passwordResetExpiresAt &&
      user.passwordResetExpiresAt.getTime() > Date.now();

    if (!isValid) {
      throw new BadRequestException('Invalid or expired token');
    }

    //! se consume el token de forma atómica: si dos pedidos llegan a la vez, solo uno pasa.
    //! además cierra sesión en todos los dispositivos
    const { affected } = await this.userRepository.update(
      { id: user.id, passwordResetToken: tokenHash },
      {
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        sessionToken: null,
      },
    );

    if (!affected) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.userService.changePassword(user.id, {
      password: dto.newPassword,
    });

    return { message: 'Password updated successfully' };
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

  /*   async googleVerify(idToken: string) {
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

    // 1. Buscar primero por Google ID
    let customer = await this.customerRepository.findOne({
      where: { idProvider: sub, provider: AuthProviders.GOOGLE },
    });

    // 2. Si no existe por Google ID, buscar por email
    if (!customer) {
      customer = await this.findCustomerByEmail(email);

      // Si existe por email (de Apple u otro), vincular cuenta Google
      if (customer) {
        customer.idProvider = sub;
        customer.provider = AuthProviders.GOOGLE;

        if (!customer.is_verified) {
          customer.is_verified = true;
        }

        // Actualizar nombre si es necesario
        if (!customer.name && name) {
          customer.name = name;
        }

        customer = await this.customerRepository.save(customer);
      }
    }

    // 3. Crear nuevo cliente si no existe
    if (!customer) {
      customer = await this.customerRepository.save(
        this.customerRepository.create({
          email,
          name:
            name ||
            `${given_name || ''} ${family_name || ''}`.trim() ||
            `Google User ${sub.slice(0, 6)}`,
          provider: AuthProviders.GOOGLE,
          idProvider: sub,
          is_verified: true,
        }),
      );
    }

    // 4. Actualizar datos faltantes si Google los envía
    let shouldUpdate = false;

    if (!customer.name && name) {
      customer.name = name;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      customer = await this.customerRepository.save(customer);
    }

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
  } */

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
    // 2. Buscar cliente por Apple ID
    // --------------------------------------------------
    let customer = await this.customerRepository.findOne({
      where: { idProvider: sub },
    });

    // --------------------------------------------------
    // 3. Si no existe, buscar por email
    // --------------------------------------------------
    if (!customer && email) {
      customer = await this.customerRepository.findOne({
        where: { email },
      });

      // --------------------------------------------------
      // Vincular cuenta Apple a usuario existente
      // --------------------------------------------------
      if (customer) {
        customer.idProvider = sub;
        customer.provider = AuthProviders.APPLE;

        if (!customer.is_verified) {
          customer.is_verified = true;
        }

        customer = await this.customerRepository.save(customer);
      }
    }

    // --------------------------------------------------
    // 4. Crear cliente si no existe
    // --------------------------------------------------
    if (!customer) {
      customer = await this.customerRepository.save(
        this.customerRepository.create({
          email: email || '',
          name: fullName ?? `Apple User ${sub.slice(0, 6)}`,
          provider: AuthProviders.APPLE,
          idProvider: sub,
          is_verified: true,
        }),
      );
    }

    // --------------------------------------------------
    // 5. Completar datos faltantes
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
    // 6. Generar JWT propio
    // --------------------------------------------------
    const token = this.generateJwt({
      id: customer.id,
      type: LoginType.customer,
    });

    // --------------------------------------------------
    // 7. Invalidar sesión previa
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

  /*   async appleVerify(dto: AppleLoginDto) {
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
          is_verified: true,
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
  } */

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
  //?                          Register_Customer_With_Password                                        */
  //? ============================================================================================== */

  //! endpoint temporal solo para pruebas de Android, luego se comenta
  async registerCustomerWithPassword(dto: RegisterCustomerDto) {
    const { email, password, name, ci } = dto;

    const existingCustomer = await this.customerRepository.findOneBy({
      email,
    });
    if (existingCustomer) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCustomer = this.customerRepository.create({
      email,
      name,
      ci,
      password: hashedPassword,
      provider: AuthProviders.GOOGLE, //! placeholder, cuenta creada solo con password para pruebas
      idProvider: `test-${email}`,
      is_verified: true,
    });

    const customer = await this.customerRepository.save(newCustomer);
    const { password: _, ...entityWithoutPassword } = customer;

    const token = this.generateJwt({
      id: customer.id,
      type: LoginType.customer,
    });

    await this.customerRepository.update(
      { id: customer.id },
      { sessionToken: token },
    );

    return {
      customer: entityWithoutPassword,
      token,
    };
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

  //* ============================================================================================== */

  private hashResetToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  //* ============================================================================================== */

  //! 400 y no 401: se usa con el user logueado y un 401 haría que el front cierre su sesión
  private async verifyUserPassword(userId: number, password: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, enabled: true },
      select: { id: true, password: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Invalid password');
    }
  }
}

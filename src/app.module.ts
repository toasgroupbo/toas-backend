import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config/environments/environments';

import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';

import { UsersModule } from './modules/users/users.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { CompaniesModule } from './modules/companies/companies.module';

import { OwnersModule } from './modules/owners/owners.module';
import { OfficesModule } from './modules/offices/offices.module';

import { RoutesModule } from './modules/routes/routes.module';
import { BusesModule } from './modules/buses/buses.module';
import { TravelsModule } from './modules/travels/travels.module';
import { TicketsModule } from './modules/tickets/tickets.module';

import { CustomersModule } from './modules/customers/customers.module';
import { WalletModule } from './modules/wallet/wallet.module';

import { FilesModule } from './files/files.module';
import { LoggerModule } from './logger/logger.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MailModule } from './mail/mail.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envs.DB_HOST,
      port: envs.DB_PORT,
      database: envs.DB_NAME_DATABASE,
      username: envs.DB_USERNAME,
      password: envs.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: true,
    }),

    AuthModule,
    RolesModule,

    CustomersModule,
    UsersModule,

    BankAccountsModule,
    CompaniesModule,
    OwnersModule,

    BusesModule,
    OfficesModule,

    RoutesModule,

    TravelsModule,
    TicketsModule,

    FilesModule,
    MailModule,

    TransactionsModule,

    LoggerModule,

    PaymentsModule,

    SettingsModule,

    WalletModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

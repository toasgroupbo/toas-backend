import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { envs } from './config/environments/environments';

import { AuthModule } from './auth/auth.module';

import { MailModule } from './mail/mail.module';
import { FilesModule } from './files/files.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { BusesModule } from './modules/buses/buses.module';
import { OwnersModule } from './modules/owners/owners.module';
import { RoutesModule } from './modules/routes/routes.module';
import { TravelsModule } from './modules/travels/travels.module';
import { OfficesModule } from './modules/offices/offices.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { BalanceModule } from './modules/balances/balances.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { LoggerModule } from './logger/logger.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';

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
      //migrations: [process.env.NODE_ENV === 'production' ? 'dist/migrations/*.js' : 'src/migrations/*.ts'],
    }),

    //SchedulerModule,

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

    BalanceModule,

    LoggerModule,

    PaymentsModule,

    SettingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

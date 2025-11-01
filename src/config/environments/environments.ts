import 'dotenv/config';
import * as joi from 'joi';

interface IEnvironmentVariables {
  // Server
  PORT: number;
  HOST: string;
  // JWT
  JWT_SECRET: string;
  SIGN_OPTIONS: string;
  // DB
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME_DATABASE: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  //GOOGLE
  GOOGLE_ID_OAUTH: string;
  GOOGLE_SECRET_KEY: string;
  GOOGLE_CALLBACK: string;

  //constants
  RESERVATION_EXPIRE_MINUTES: number;
  BALANCE_EXPIRATION_DAYS: number;
}

const environmentsSchema = joi
  .object<IEnvironmentVariables>({
    PORT: joi.number().default(3000).required(),
  })
  .unknown(true);

const { error, value } = environmentsSchema.validate(process.env);

if (error) {
  throw new Error(`Environment variables validation error: ${error.message}`);
}

const envVariables: IEnvironmentVariables = value;

export const envs = {
  // Server
  PORT: envVariables.PORT,
  HOST: envVariables.HOST,
  // JWT
  JWT_SECRET: envVariables.JWT_SECRET,
  SIGN_OPTIONS: envVariables.SIGN_OPTIONS,
  // DB
  DB_HOST: envVariables.DB_HOST,
  DB_PORT: envVariables.DB_PORT,
  DB_NAME_DATABASE: envVariables.DB_NAME_DATABASE,
  DB_USERNAME: envVariables.DB_USERNAME,
  DB_PASSWORD: envVariables.DB_PASSWORD,
  //GOOGLE
  GOOGLE_ID_OAUTH: envVariables.GOOGLE_ID_OAUTH,
  GOOGLE_SECRET_KEY: envVariables.GOOGLE_SECRET_KEY,
  GOOGLE_CALLBACK: envVariables.GOOGLE_CALLBACK,
  //constants
  RESERVATION_EXPIRE_MINUTES: envVariables.RESERVATION_EXPIRE_MINUTES,
  BALANCE_EXPIRATION_DAYS: envVariables.BALANCE_EXPIRATION_DAYS,
};

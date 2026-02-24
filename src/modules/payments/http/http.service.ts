import { Injectable } from '@nestjs/common';
import * as https from 'https';
import axios from 'axios';
import * as fs from 'fs';
import { join } from 'path';

import { envs } from 'src/config/environments/environments';

import { QrGenerateResponse } from '../interfaces/qr-generate-response.interface';
import { QrGenerate } from '../interfaces/qr-generate.interface';

@Injectable()
export class HttpService {
  private readonly axiosInstance: ReturnType<typeof axios.create>;

  constructor() {
    // Leer el certificado PFX
    const certPath = join(process.cwd(), 'static/certs/bcp_cert_prueba.pfx'); //! cambiar para producción

    const pfxBuffer = fs.readFileSync(certPath);

    // Configurar el agente HTTPS con el certificado
    const httpsAgent = new https.Agent({
      pfx: pfxBuffer,
      passphrase: envs.BCP_PASSPHRASE,
      servername: envs.BCP_SERVER_NAME,
      rejectUnauthorized: true, // IMPORTANTE: poner true
      secureProtocol: 'TLSv1_2_method',

      // Timeout del agente
      timeout: 60000, // 60 segundos
      keepAlive: false,
      maxSockets: 10,
    });

    // Crear instancia de Axios
    this.axiosInstance = axios.create({
      baseURL: envs.BCP_URL,
      httpsAgent: httpsAgent,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      //timeout: 30000,

      //keepAlive: false, //  IMPORTANTE para APIs bancarias inestables
      //maxSockets: 10, // evita saturación
      transitional: {
        clarifyTimeoutError: true,
      },
      timeout: 60000, // 60 segundos
    } as any);
  }

  async generateQr(dto: QrGenerate): Promise<QrGenerateResponse> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 45000); // 45s reales

    try {
      const base64Auth = Buffer.from(
        `${envs.BCP_USER}:${envs.BCP_PASSWORD}`,
      ).toString('base64');

      const headers = {
        'Content-Type': 'application/json',
        'Correlation-Id': dto.IdCorrelation,
        Authorization: `Basic ${base64Auth}`,
      };

      const requestBody = {
        appUserId: envs.BCP_APP_USER_ID,
        currency: 'BOB',
        amount: dto.amount,
        gloss: dto.gloss || 'App Buses Toas',
        serviceCode: '050',
        businessCode: envs.BCP_BUSINESS_CODE,
        singleUse: true,
        enableBank: 'ALL',
        city: 'Santa Cruz',
        branchOffice: 'toas',
        teller: '1',
        publicToken: envs.BCP_PUBLIC_TOKEN,
        expiration: dto.expiration,
        collectors: dto.collectors,
      };

      const response = await this.axiosInstance.post(
        '/Web_ApiQr/api/v4/Qr/Generated',
        requestBody,
        {
          headers,
          signal: controller.signal,
        } as any,
      );

      clearTimeout(timeout);

      const responseData = response.data as QrGenerateResponse;

      if (responseData.state !== '00') {
        throw {
          state: responseData.state,
          message: responseData.message,
          details: responseData,
        };
      }

      return responseData;
    } catch (error: any) {
      clearTimeout(timeout);

      if (error.name === 'CanceledError' || error.name === 'AbortError') {
        throw {
          state: '98',
          message: 'Timeout - solicitud cancelada',
          details: 'BCP no respondió dentro del tiempo permitido',
        };
      }

      if (error.response?.data) {
        throw {
          state: error.response.data.state || '99',
          message: error.response.data.message || 'Error general',
          details: error.response.data,
        };
      }

      throw {
        state: '99',
        message: 'Error de comunicación',
        details: error.message,
      };
    }
  }

  /* async generateQr(dto: QrGenerate): Promise<QrGenerateResponse> {
    try {
      const user = envs.BCP_USER;
      const password = envs.BCP_PASSWORD;
      const authString = `${user}:${password}`;
      const base64Auth = Buffer.from(authString).toString('base64');

      const headers = {
        'Content-Type': 'application/json',
        'Correlation-Id': dto.IdCorrelation,
        Authorization: `Basic ${base64Auth}`,
      };

      const requestBody = {
        appUserId: envs.BCP_APP_USER_ID,
        currency: 'BOB',
        amount: dto.amount,
        gloss: dto.gloss || 'App Buses Toas',
        serviceCode: '050',
        businessCode: envs.BCP_BUSINESS_CODE,
        singleUse: true,
        enableBank: 'ALL',
        city: 'Santa Cruz',
        branchOffice: 'toas',
        teller: '1',
        publicToken: envs.BCP_PUBLIC_TOKEN,
        expiration: dto.expiration, //'00/00:00',
        collectors: dto.collectors,
      };

      const response = await this.axiosInstance.post(
        '/Web_ApiQr/api/v4/Qr/Generated',
        requestBody,
        { headers },
      );

      const responseData = response.data as QrGenerateResponse;

      if (responseData.state !== '00') {
        throw {
          state: responseData.state,
          message: responseData.message,
          details: responseData,
        };
      }

      return responseData;
    } catch (error) {
      if (error.response?.data) {
        throw {
          state: error.response.data.state || '99',
          message: error.response.data.message || 'Error general',
          details: error.response.data,
        };
      }
      throw {
        state: '99',
        message: 'Error de comunicación',
        details: error.message,
      };
    }
  } */
}

import { Injectable } from '@nestjs/common';
import * as https from 'https';
import axios from 'axios';
import * as fs from 'fs';
import { join } from 'path';

import { envs } from 'src/config/environments/environments';

import { BcpQrResponse } from '../interfaces/bcp-qr.interface';
import { GenerateQrInterface } from '../interfaces/generate-qr.interface';

@Injectable()
export class HttpService {
  /*   private readonly axiosInstance: ReturnType<typeof axios.create>;

  constructor() {
    // Leer el certificado PFX
    const certPath = join(
      process.cwd(),
      'src/certs/sandbox.openbanking.bcp.com.bo.pfx',
    );

    const pfxBuffer = fs.readFileSync(certPath);

    // Configurar el agente HTTPS con el certificado
    const httpsAgent = new https.Agent({
      pfx: pfxBuffer,
      passphrase: envs.BCP_PASSPHRASE,
      servername: envs.BCP_SERVER_NAME,
      rejectUnauthorized: true, // IMPORTANTE: poner true
      secureProtocol: 'TLSv1_2_method',
    });

    // Crear instancia de Axios
    this.axiosInstance = axios.create({
      baseURL: envs.BCP_URL,
      timeout: 30000,
      httpsAgent: httpsAgent,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    } as any);
  }

  async generateQr(dto: GenerateQrInterface): Promise<BcpQrResponse> {
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
        expiration: '00/00:00', //'00/00:00',
        collectors: dto.collectors,
      };

      const response = await this.axiosInstance.post(
        '/Web_ApiQr/api/v4/Qr/Generated',
        requestBody,
        { headers },
      );

      const responseData = response.data as BcpQrResponse;

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

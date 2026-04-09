/* import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { envs } from 'src/config/environments/environments';

@Injectable()
export class HttpService {
  private readonly axiosInstance: ReturnType<typeof axios.create>;

  constructor() {
    // Crear instancia de Axios
    this.axiosInstance = axios.create({
      baseURL: envs.H2H_BASEURL,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      transitional: {
        clarifyTimeoutError: true,
      },
      timeout: 60000,
    } as any);
  }

  //? ============================================================================================== ?/
  //?                                 ProcessMultiple                                                ?/
  //? ============================================================================================== ?/

  async processMultiple(data: {
    data: string;
    signature: string;
  }): Promise<any> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      const base64Auth = Buffer.from(
        `${envs.H2H_USERNAME}:${envs.H2H_PASSWORD}`,
      ).toString('base64');

      const headers = {
        Authorization: `Basic ${base64Auth}`,
      };

      const requestBody = {
        companyId: envs.H2H_COMPANYID,
        data: data.data,
        signature: data.signature,
      };

      const response = await this.axiosInstance.post(
        '/ProcessMultiple',
        requestBody,
        {
          headers,
          signal: controller.signal,
        } as any,
      );

      clearTimeout(timeout);

      return response.data;
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

  //? ============================================================================================== ?/
  //?                                 AuthorizedBatch                                                ?/
  //? ============================================================================================== ?/

  async authorizedBatch(data: {
    data: string;
    signature: string;
  }): Promise<any> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      const base64Auth = Buffer.from(
        `${envs.H2H_USERNAME}:${envs.H2H_PASSWORD}`,
      ).toString('base64');

      const headers = {
        Authorization: `Basic ${base64Auth}`,
      };

      const requestBody = {
        companyId: envs.H2H_COMPANYID,
        data: data.data,
        signature: data.signature,
      };

      const response = await this.axiosInstance.post(
        '/AuthorizedBatch',
        requestBody,
        {
          headers,
          signal: controller.signal,
        } as any,
      );

      clearTimeout(timeout);

      return response.data;
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

  //? ============================================================================================== ?/
  //?                                  GetBatchDetail                                                ?/
  //? ============================================================================================== ?/

  async getBatchDetail(data: {
    data: string;
    signature: string;
  }): Promise<any> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      const base64Auth = Buffer.from(
        `${envs.H2H_USERNAME}:${envs.H2H_PASSWORD}`,
      ).toString('base64');

      const headers = {
        Authorization: `Basic ${base64Auth}`,
      };

      const requestBody = {
        companyId: envs.H2H_COMPANYID,
        data: data.data,
        signature: data.signature,
      };

      const response = await this.axiosInstance.post(
        '/GetBatchDetail',
        requestBody,
        {
          headers,
          signal: controller.signal,
        } as any,
      );

      clearTimeout(timeout);

      return response.data;
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
}
 */

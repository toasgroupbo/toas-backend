import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';

import { StaticRoles } from 'src/auth/enums';
import { TravelStatus } from '../travels/enums';
import { BankCode } from '../bank-accounts/enums/bank-code.enum';

import { ResponseBCP } from './interfaces/response-bcp.interface';
import { DecryptGetBatchDetail } from './interfaces/decrypt-get-batch-detail.interface';
import { DecryptProcessMultiple } from './interfaces/decrypt-process-multiple.interface';
import { DecryptAuthorizedBatch } from './interfaces/decrypt-authorized-batch.interface';
import { GetBatchDetailEncrypt } from './interfaces/toEncrypt/getbatchdetail-to-encrypt.interface';
import { AuthorizedBachToEncrypt } from './interfaces/toEncrypt/authorizedbach-to-encrypt.interface';
import { ProcessMultipleToEncrypt } from './interfaces/toEncrypt/processmultiple-to-encrypt.interface';

import { CryptoService } from './crypto.service';
import { HttpService } from './http/http.service';

import { Travel } from '../travels/entities/travel.entity';
import { Company } from '../companies/entities/company.entity';
import { Transaction, TransactionStatus } from './entities/transaction.entity';

enum BcpResponseCode {
  SUCCESS = '00',
  OUT_OF_TIME = '01',
  COMPANY_ERROR = '02',
  PROCESS_ERROR = '03',
  SIGNATURE_ERROR = '04',
  DECRYPT_ERROR = '05',
  ACCOUNT_ERROR = '06',
  INVALID_IP = '08',
  AUTH_ERROR = '12',
  USER_NOT_FOUND = '14',
  CONNECTION_ERROR = '16',
  VALIDATION_ERROR = '99',
}

enum PaymentType {
  PROV = 'PROV',
  ACH = 'ACH',
  ODD = 'ODD',
}

enum Currency {
  BOL = 'BOL',
  USD = 'USD',
}

interface PreparedTransaction {
  company: Company;
  travels: Travel[];
  transaction: Transaction;
  payload: ProcessMultipleToEncrypt;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,

    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    private readonly cryptoService: CryptoService,
    private readonly httpService: HttpService,

    private readonly dataSource: DataSource,
  ) {}

  //? ============================================================================================== ?/
  //? ============================================================================================== ?/

  async processTransactions() {
    const preparedTransactions = await this.prepareTransactions();

    for (const prepared of preparedTransactions) {
      const { transaction, payload } = prepared;

      try {
        const response = await this.proccesMultiple(payload);

        // VALIDAR RESPUESTA DEL BANCO
        if (response.Code !== BcpResponseCode.SUCCESS) {
          transaction.status = TransactionStatus.FAILED;
          transaction.errorMessage = response.Message;
          transaction.responsePayload = response;

          await this.transactionRepository.save(transaction);
          continue;
        }

        // solo si es exitoso
        transaction.status = TransactionStatus.PROCESSED;
        transaction.transactionId = String(response.TransactionId);
        transaction.responsePayload = response;
        transaction.processedAt = new Date();

        await this.transactionRepository.save(transaction);
      } catch (error) {
        transaction.status = TransactionStatus.FAILED;
        transaction.errorMessage = error.message;

        await this.transactionRepository.save(transaction);

        continue;
      }
    }
  }

  //? ============================================================================================== ?/
  //? ============================================================================================== ?/

  async authorizeTransactions() {
    const transactions = await this.transactionRepository.find({
      where: {
        status: TransactionStatus.PROCESSED,
        transactionId: Not(IsNull()),
      },
    });

    if (!transactions.length) return;

    // 2. Filtrar las que tienen transactionId del banco
    const validTransactions = transactions.filter((t) => t.transactionId);

    if (!validTransactions.length) return;

    // 3. Mapear IDs del banco
    const transactionsId = validTransactions.map((t) =>
      Number(t.transactionId),
    );

    try {
      const response = await this.authorizedBatch(transactionsId);

      // validar respuesta del banco
      if (response.Code !== BcpResponseCode.SUCCESS) {
        throw new Error(response.Message);
      }

      // 5. Actualizar TODAS como AUTHORIZED
      for (const transaction of validTransactions) {
        transaction.status = TransactionStatus.AUTHORIZED;
        transaction.authorizedAt = new Date();

        transaction.responsePayload = {
          ...transaction.responsePayload,
          authorize: response,
        };

        await this.transactionRepository.save(transaction);
      }
    } catch (error) {
      // NO cambiar a FAILED
      // porque el lote ya existe

      for (const transaction of validTransactions) {
        transaction.errorMessage = `Authorize error: ${error.message}`;
        await this.transactionRepository.save(transaction);
      }
    }
  }

  //? ============================================================================================== ?/
  //? ============================================================================================== ?/

  async syncBatchResults() {
    const transactions = await this.transactionRepository.find({
      where: {
        status: TransactionStatus.AUTHORIZED,
      },
    });

    if (!transactions.length) return;

    console.log(transactions);

    const transactionsId = transactions
      .filter((t) => t.transactionId)
      .map((t) => Number(t.transactionId));

    const response = await this.getBatchDetail(transactionsId);

    console.log(response.Result);

    if (response.Code !== BcpResponseCode.SUCCESS) {
      throw new Error(response.Message);
    }

    for (const result of response.Result) {
      const transaction = transactions.find(
        (t) => Number(t.transactionId) === result.ProcessBatchId,
      );

      if (!transaction) continue;

      //! Revisar
      if (result.StatusOperation !== 'Completado') {
        continue;
      }
      //!

      const snapshot = transaction.travelsSnapshot || [];

      const payments = [
        ...result.Spreadsheet.FormProvidersPayments,
        ...result.Spreadsheet.FormAchPayments,
      ];

      let successCount = 0;

      for (const payment of payments) {
        const snapshotItem = snapshot.find((s) => s.line === payment.Line);

        if (!snapshotItem) continue;

        const isSuccess =
          payment.OperationStatusDescription?.toLowerCase().includes(
            'autorizado',
          ) ||
          payment.OperationStatusDescription?.toLowerCase().includes(
            'completed',
          );

        if (isSuccess) {
          await this.travelRepository.update(snapshotItem.travelId, {
            isPaid: true,
            transaction: transaction,
          });

          successCount++;
        }
      }

      // estado final
      if (successCount === payments.length) {
        transaction.status = TransactionStatus.COMPLETED;
        transaction.completedAt = new Date();
      } else if (successCount > 0) {
        transaction.status = TransactionStatus.PARTIAL;
      } else {
        transaction.status = TransactionStatus.FAILED;
      }

      transaction.responsePayload = {
        ...transaction.responsePayload,
        batchDetail: result,
      };

      await this.transactionRepository.save(transaction);
    }
  }

  //? ============================================================================================== ?/

  private async prepareTransactions(): Promise<PreparedTransaction[]> {
    const preparedTransactions: PreparedTransaction[] = [];

    await this.dataSource.transaction(async (manager) => {
      // Buscar empresas con viajes pendientes de pago
      const companies = await manager.find(Company, {
        where: {
          users: { rol: { name: StaticRoles.COMPANY_ADMIN } }, //! cuidado
          travels: {
            travel_status: TravelStatus.CLOSED,
            enabled: true,
            isPaid: false,
          },
        },
        relations: {
          travels: true,
          bankAccount: true,
          users: true,
        },
      });

      for (const company of companies) {
        // Filtrar viajes no pagados
        const unpaidTravels = company.travels.filter(
          (t) => !t.isPaid && t.travel_status === TravelStatus.CLOSED,
        );

        if (unpaidTravels.length === 0) continue;

        // Calcular monto total
        const totalNet = unpaidTravels.reduce(
          (sum, t) => sum + Number(t.net_to_company),
          0,
        );

        if (totalNet <= 0) {
          console.log(
            `Empresa ${company.name}: monto total inválido (${totalNet})`,
          );
          continue;
        }

        // Crear registro de transacción
        const transaction = manager.create(Transaction, {
          companyId: company.id,
          amount: totalNet.toString(),
          status: TransactionStatus.PENDING,
        });
        await manager.save(transaction);

        // Construir payload para el banco
        const payload = this.buildProcessMultiplePayload(
          company,
          unpaidTravels,
          totalNet,
        );

        // Guardar payload para auditoría
        transaction.requestPayload = JSON.stringify(payload);
        await manager.save(transaction);

        preparedTransactions.push({
          company,
          travels: unpaidTravels,
          transaction,
          payload,
        });

        console.log(
          `📝 Preparado: ${company.name} - ${totalNet} Bs. (${unpaidTravels.length} viajes)`,
        );
      }
    });

    return preparedTransactions;
  }

  //? ============================================================================================== ?/

  private buildProcessMultiplePayload(
    company: Company,
    travels: Travel[],
    totalNet: number,
  ): ProcessMultipleToEncrypt {
    const isBcp = company.bankAccount.bankCode === BankCode.BANCO_DE_CREDITO;

    // IMPORTANTE: Si son múltiples travels, debes crear múltiples líneas
    // NO agrupar todo en una sola línea
    const paymentLines = travels.map((travel, index) => ({
      line: index + 1,
      amount: Number(travel.net_to_company),
      travelId: travel.id,
    }));

    return {
      // Usar valores REALES

      documentNumber: '01000029',
      documentType: 'Q',
      documentExtension: 'SN',
      documentComplement: '',
      amount: totalNet,
      currency: Currency.BOL,
      fundSource: 'Venta pasajes',
      fundDestination: `Pago a ${company.name}`,
      sourceAccount: '7015103341336', //! cuenta real de Toass
      sourceCurrency: Currency.BOL,
      description: `Pago automático travels`,
      sendVouchers: company.users[0]?.email /* || 'prueba@gmail.com' */,

      cismartApprovers: [
        {
          idc: '07706841-Q-SC', // ← Cambiar de 'CB' a 'LP'
          type: 1,
        },
      ],

      spreadsheet: {
        // Crear UNA LÍNEA POR TRAVEL
        formProvidersPayments: isBcp
          ? paymentLines.map(({ line, amount, travelId }) => ({
              paymentType: PaymentType.PROV,
              line,
              accountNumber: Number(company.bankAccount.account),
              glossPayment: `Pago travel ${travelId}`,
              amount,
              documentType: company.bankAccount.documentType,
              documentNumber: company.bankAccount.documentNumber,
              documentExtension: company.bankAccount.documentExtension,
              firstDetail: `Travel ID: ${travelId}`,
              secondDetails: '',
              mail: company.users[0]?.email, //company.admin?.email,
            }))
          : [],

        formAchPayments: !isBcp
          ? paymentLines.map(({ line, amount, travelId }) => ({
              paymentType: PaymentType.ACH,
              line,
              accountNumber: Number(company.bankAccount.account),
              titularName: company.bankAccount.titularName,
              amount,
              branchOfficeId: company.bankAccount.branchOfficeId,
              firstDetail: `Travel ID: ${travelId}`,
              mail: company.users[0]?.email, //company.admin?.email,
              bankId: company.bankAccount.bankCode,
              documentNumber: company.bankAccount.documentNumber,
              documentType: company.bankAccount.documentType,
              documentExtension: company.bankAccount.documentExtension,
              documentComplement: '',
            }))
          : [],
      },
    };
  }

  //? ============================================================================================== ?/
  //?                              Process_Multiple                                                  ?/
  //? ============================================================================================== ?/

  private async proccesMultiple(
    payloadProcessMultipleToEncrypt: ProcessMultipleToEncrypt,
  ): Promise<DecryptProcessMultiple> {
    const encrypted = this.cryptoService.encryptProcessMultiple(
      payloadProcessMultipleToEncrypt,
    );

    const response: ResponseBCP = await this.httpService.processMultiple({
      data: encrypted.data,
      signature: encrypted.signature,
    });

    return this.decryptResponse<DecryptProcessMultiple>(response);
  }

  //? ============================================================================================== ?/
  //?                              Authorized_Batch                                                  ?/
  //? ============================================================================================== ?/

  private async authorizedBatch(
    transactionsId: number[],
  ): Promise<DecryptAuthorizedBatch> {
    const payload: AuthorizedBachToEncrypt = {
      TransactionsId: transactionsId,
      UserIp: '212.85.20.252',
      documentNumber: '07706841',
      documentType: 'Q',
      documentExtension: 'SC',
      documentComplement: '',
      type: '1',
    };

    const encrypted = this.cryptoService.encryptAuthorizedBatch(payload);

    const response: ResponseBCP = await this.httpService.authorizedBatch({
      data: encrypted.data,
      signature: encrypted.signature,
    });

    return this.decryptResponse<DecryptAuthorizedBatch>(response);
  }

  //? ============================================================================================== ?/
  //?                              Get_Batch_Detail                                                  ?/
  //? ============================================================================================== ?/

  private async getBatchDetail(
    transactionsId: number[],
  ): Promise<DecryptGetBatchDetail> {
    const payload: GetBatchDetailEncrypt = {
      documentNumber: '00255921',
      documentType: 'Q',
      documentExtension: 'LP',
      documentComplement: '',
      transactionsId: transactionsId,
    };

    const encrypted = this.cryptoService.encryptGetBatchDetail(payload);

    const response: ResponseBCP = await this.httpService.getBatchDetail({
      data: encrypted.data,
      signature: encrypted.signature,
    });

    return this.decryptResponse<DecryptGetBatchDetail>(response);
  }

  //? ============================================================================================== ?/
  //?                              Decrypt Response Helper                                           ?/
  //? ============================================================================================== ?/

  private decryptResponse<T extends { Code: string; Message: string }>(
    response: ResponseBCP,
  ): T {
    if (!response) {
      throw new Error('Respuesta del banco es null o undefined');
    }

    if (response.isOk === true) {
      if (!response.body) {
        throw new Error('Respuesta exitosa sin body para desencriptar');
      }
      return this.cryptoService.decryptData<T>(response.body);
    }

    if (response.isOk === false) {
      if (!response.message) {
        throw new Error('Respuesta de error sin message para desencriptar');
      }

      const decrypted = this.cryptoService.decryptData<any>(response.message);

      if (typeof decrypted === 'string') {
        return {
          Code: 'ERROR',
          Message: decrypted,
        } as T;
      }

      return {
        Code: decrypted.Code || 'ERROR',
        Message: decrypted.Message || decrypted.message || 'Error desconocido',
        ...decrypted,
      } as T;
    }

    throw new Error(`Estado de respuesta inválido: ${response.isOk}`);
  }
}

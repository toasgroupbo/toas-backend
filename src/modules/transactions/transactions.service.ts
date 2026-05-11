import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';

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

import { Owner } from '../owners/entities/owner.entity';
import { Travel } from '../travels/entities/travel.entity';
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
  owner: Owner;
  travel: Travel;
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
  //?                                       Process                                                  ?/
  //? ============================================================================================== ?/

  async processTransaction(travelId: number) {
    const preparedTransaction = await this.prepareTransaction(travelId);
    const { transaction, payload } = preparedTransaction;

    try {
      const response = await this.proccesMultiple(payload);

      // VALIDAR RESPUESTA DEL BANCO
      if (response.Code !== BcpResponseCode.SUCCESS) {
        transaction.status = TransactionStatus.FAILED;
        transaction.errorMessage = response.Message;
        transaction.processResponse = response;

        return await this.transactionRepository.save(transaction);
      }

      // solo si es exitoso
      transaction.status = TransactionStatus.PROCESSED;
      transaction.transactionId = String(response.TransactionId);
      transaction.processResponse = response;
      transaction.processedAt = new Date();

      //return await this.transactionRepository.save(transaction);
      const transactionEntity =
        await this.transactionRepository.save(transaction);

      return this.authorizeTransaction(transactionEntity.id);
    } catch (error) {
      transaction.status = TransactionStatus.FAILED;
      transaction.errorMessage = error.message;

      await this.transactionRepository.save(transaction);
    }
  }

  //? ============================================================================================== ?/
  //?                                    Authorized                                                  ?/
  //? ============================================================================================== ?/

  async authorizeTransaction(transactionId: number) {
    // =====================================================
    // Buscar transaction
    // =====================================================

    const transaction = await this.transactionRepository.findOne({
      where: {
        id: transactionId,
        status: TransactionStatus.PROCESSED,
        transactionId: Not(IsNull()),
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction Not Found');
    }

    // =====================================================
    // ID del banco
    // =====================================================

    const transactionsId = [Number(transaction.transactionId)];

    // =====================================================
    // Guardar request
    // =====================================================

    transaction.authorizeRequest = {
      transactionsId,
    };

    await this.transactionRepository.save(transaction);

    try {
      // ===================================================
      // Autorizar en banco
      // ===================================================

      const response = await this.authorizedBatch(transactionsId);
      transaction.authorizeResponse = response;

      // ===================================================
      // Validar respuesta
      // ===================================================

      if (response.Code !== BcpResponseCode.SUCCESS) {
        transaction.errorMessage = response.Message;

        transaction.bankErrors = [
          ...(transaction.bankErrors || []),
          {
            step: 'authorizeBatch',
            date: new Date(),
            message: response.Message,
          },
        ];

        await this.transactionRepository.save(transaction);

        throw new BadRequestException(response.Message);
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      /* transaction.status = TransactionStatus.AUTHORIZED;

      transaction.authorizedAt = new Date();

      await this.transactionRepository.save(transaction);

      return transaction; */

      transaction.status = TransactionStatus.AUTHORIZED;
      transaction.authorizedAt = new Date();

      await this.transactionRepository.save(transaction);

      // =====================================================
      // Travel
      // =====================================================

      const snapshot = transaction.travelsSnapshot?.[0];

      if (snapshot) {
        await this.travelRepository.update(snapshot.travelId, {
          isPaid: true,
          paidAt: new Date(),
          transaction,
        });
      }

      return transaction;
    } catch (error) {
      // ===================================================
      // Error general
      // ===================================================

      transaction.errorMessage = `Authorize error: ${error.message}`;

      transaction.bankErrors = [
        ...(transaction.bankErrors || []),
        {
          step: 'authorizeBatch',
          date: new Date(),
          message: error.message,
        },
      ];

      await this.transactionRepository.save(transaction);

      throw error;
    }
  }

  //? ============================================================================================== ?/
  //?                                    Get_Detail                                                  ?/
  //? ============================================================================================== ?/

  async verifyTransaction(transactionId: number) {
    const transaction = await this.transactionRepository.findOne({
      where: {
        id: transactionId,
        status: TransactionStatus.AUTHORIZED,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction Not Found');
    }

    if (!transaction.transactionId) {
      throw new BadRequestException('Transaction without bank ID');
    }

    // =====================================================
    // Request
    // =====================================================

    const transactionsId = [Number(transaction.transactionId)];

    transaction.batchDetailRequest = {
      transactionsId,
    };

    await this.transactionRepository.save(transaction);

    // =====================================================
    // Consultar banco
    // =====================================================

    const response = await this.getBatchDetail(transactionsId);

    // =====================================================
    // Validar respuesta general
    // =====================================================

    if (response.Code !== BcpResponseCode.SUCCESS) {
      throw new BadRequestException(response.Message);
    }

    // =====================================================
    // Resultado único
    // =====================================================

    const result = response.Result?.[0];

    if (!result) {
      throw new BadRequestException('Bank result not found');
    }

    // =====================================================
    // Snapshot
    // =====================================================

    const snapshot = transaction.travelsSnapshot?.[0];

    if (!snapshot) {
      throw new BadRequestException('Snapshot not found');
    }

    // =====================================================
    // Payment único
    // =====================================================

    const payment =
      result.Spreadsheet?.FormProvidersPayments?.[0] ||
      result.Spreadsheet?.FormAchPayments?.[0];

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // =====================================================
    // Validar éxito
    // =====================================================

    const isSuccess = !!String(payment.OperationNumberDebitHost || '').trim();

    // =====================================================
    // Buscar travel
    // =====================================================

    const travel = await this.travelRepository.findOne({
      where: {
        id: snapshot.travelId,
      },
    });

    if (!travel) {
      throw new NotFoundException('Travel Not Found');
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    /* if (isSuccess) {
      if (!travel.isPaid) {
        await this.travelRepository.update(travel.id, {
          isPaid: true,
          paidAt: new Date(),
          transaction,
        });
      }

      transaction.status = TransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
    } else {
      transaction.status = TransactionStatus.FAILED;
    } */

    if (isSuccess) {
      if (!travel.isPaid) {
        await this.travelRepository.update(travel.id, {
          isPaid: true,
          paidAt: new Date(),
          transaction,
        });
      }

      transaction.status = TransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
    } else {
      transaction.status = TransactionStatus.FAILED;

      // =====================================================
      // Revertir pago
      // =====================================================

      await this.travelRepository.update(travel.id, {
        isPaid: false,
        paidAt: null,
        //transaction: null,
      });
    }

    // =====================================================
    // Guardar response
    // =====================================================

    transaction.batchDetailResponse = result;
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  //? ============================================================================================== ?/
  //? ============================================================================================== ?/

  private async prepareTransaction(
    travelId: number,
  ): Promise<PreparedTransaction> {
    return await this.dataSource.transaction(async (manager) => {
      // =====================================================
      // Buscar travel
      // =====================================================

      const travel = await manager.findOne(Travel, {
        where: {
          id: travelId,
          travel_status: TravelStatus.CLOSED,
          enabled: true,
          isPaid: false,
        },
        relations: {
          company: true,
          bus: {
            owner: {
              bankAccount: true,
              users: true,
            },
          },
        },
      });

      if (!travel) {
        throw new NotFoundException('Travel Not Found');
      }

      // =====================================================
      // Owner
      // =====================================================

      const owner = travel.bus?.owner;

      if (!owner) {
        throw new NotFoundException('Owner Not Found');
      }

      // =====================================================
      // Validaciones bancarias
      // =====================================================

      if (!owner.bankAccount) {
        throw new NotFoundException('Bank Account Not Found');
      }

      if (!owner.bankAccount.account) {
        throw new NotFoundException('Bank Account Number Not Found');
      }

      // =====================================================
      // Monto
      // =====================================================

      const amount = Number(travel.net_to_company);
      if (amount <= 0) {
        throw new BadRequestException('The deposit amount cannot be 0');
      }

      // =====================================================
      // Crear transaction
      // =====================================================

      const transaction = manager.create(Transaction, {
        totalAmount: amount.toString(),
        status: TransactionStatus.PENDING,

        //travels:[travel],

        travelsSnapshot: [
          {
            line: 1,
            travelId: travel.id,
            amount,
          },
        ],
      });

      await manager.save(transaction);

      // =====================================================
      // Payload
      // =====================================================

      const payload = this.buildProcessPayload(owner, travel);

      // =====================================================
      // Guardar request
      // =====================================================

      transaction.processRequest = payload;
      await manager.save(transaction);

      // =====================================================
      // Resultado
      // =====================================================

      const preparedTransaction: PreparedTransaction = {
        owner,
        travel,
        transaction,
        payload,
      };

      return preparedTransaction;
    });
  }

  //? ============================================================================================== ?/
  //? ============================================================================================== ?/

  private buildProcessPayload(
    owner: Owner,
    travel: Travel,
  ): ProcessMultipleToEncrypt {
    const isBcp = owner.bankAccount.bankCode === BankCode.BANCO_DE_CREDITO;
    const amount = Number(travel.net_to_company);

    return {
      documentNumber: '1000029',
      documentType: 'Q',
      documentExtension: 'SN',
      documentComplement: '',
      amount,
      currency: Currency.BOL,
      fundSource: 'Venta pasajes',
      fundDestination: `Pago a ${owner.name}`,
      sourceAccount: '7015103341336',
      sourceCurrency: Currency.BOL,
      description: `Pago automático travel ${travel.id}`,
      sendVouchers: 'luisdiegoborja8@gmail.com',
      cismartApprovers: [
        {
          idc: '07706841-Q-XX',
          type: 1,
        },
      ],

      spreadsheet: {
        formProvidersPayments: isBcp
          ? [
              {
                paymentType: PaymentType.PROV,
                line: 1,
                accountNumber: owner.bankAccount.account,
                glossPayment: `Pago travel ${travel.id}`,
                amount,
                documentType: owner.bankAccount.documentType,
                documentNumber: owner.bankAccount.documentNumber,
                documentExtension: owner.bankAccount.documentExtension,
                firstDetail: `Travel ID: ${travel.id}`,
                secondDetails: '',
                mail: owner.users?.[0]?.email || '',
              },
            ]
          : [],
        formAchPayments: !isBcp
          ? [
              {
                paymentType: PaymentType.ACH,
                line: 1,
                accountNumber: owner.bankAccount.account,
                titularName: owner.bankAccount.titularName,
                amount,
                branchOfficeId: owner.bankAccount.branchOfficeId,
                firstDetail: `Travel ID: ${travel.id}`,
                mail: owner.users?.[0]?.email || '',
                bankId: owner.bankAccount.bankCode,
                documentNumber: owner.bankAccount.documentNumber,
                documentType: owner.bankAccount.documentType,
                documentExtension: owner.bankAccount.documentExtension,
                documentComplement: '',
              },
            ]
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
      documentExtension: 'XX',
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
      documentNumber: '07706841',
      documentType: 'Q',
      documentExtension: 'XX',
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

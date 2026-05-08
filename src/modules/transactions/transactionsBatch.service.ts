import { Injectable } from '@nestjs/common';
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
  travels: Travel[];
  transaction: Transaction;
  payload: ProcessMultipleToEncrypt;
}

@Injectable()
export class TransactionsBatchService {
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
          transaction.processResponse = response;

          await this.transactionRepository.save(transaction);
          continue;
        }

        // solo si es exitoso
        transaction.status = TransactionStatus.PROCESSED;
        transaction.transactionId = String(response.TransactionId);
        transaction.processResponse = response;
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
      for (const transaction of validTransactions) {
        transaction.authorizeRequest = {
          transactionsId,
        };

        await this.transactionRepository.save(transaction);
      }

      const response = await this.authorizedBatch(transactionsId);

      // validar respuesta del banco
      if (response.Code !== BcpResponseCode.SUCCESS) {
        throw new Error(response.Message);
      }

      // 5. Actualizar TODAS como AUTHORIZED
      for (const transaction of validTransactions) {
        transaction.status = TransactionStatus.AUTHORIZED;
        transaction.authorizedAt = new Date();
        transaction.authorizeResponse = response;

        await this.transactionRepository.save(transaction);
      }
    } catch (error) {
      // NO cambiar a FAILED
      // porque el lote ya existe

      for (const transaction of validTransactions) {
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

    const transactionsId = transactions
      .filter((t) => t.transactionId)
      .map((t) => Number(t.transactionId));

    if (!transactionsId.length) return;

    for (const transaction of transactions) {
      transaction.batchDetailRequest = {
        transactionsId,
      };

      await this.transactionRepository.save(transaction);
    }

    const response = await this.getBatchDetail(transactionsId);

    // =========================================================
    // Validación general de respuesta BCP
    // =========================================================

    if (response.Code !== BcpResponseCode.SUCCESS) {
      throw new Error(response.Message);
    }

    for (const result of response.Result) {
      const transaction = transactions.find(
        (t) => Number(t.transactionId) === result.ProcessBatchId,
      );

      if (!transaction) continue;

      const snapshot = transaction.travelsSnapshot || [];

      const payments = [
        ...(result.Spreadsheet?.FormProvidersPayments || []),
        ...(result.Spreadsheet?.FormAchPayments || []),
      ].filter((p) => p.Line);

      let successCount = 0;

      for (const payment of payments) {
        const snapshotItem = snapshot.find((s) => s.line === payment.Line);

        //console.log(snapshotItem);

        if (!snapshotItem) {
          continue;
        }

        const isSuccess = !!String(
          payment.OperationNumberDebitHost || '',
        ).trim();

        if (!isSuccess) {
          continue;
        }

        // =====================================================
        // Evitar actualizar nuevamente si ya fue pagado
        // =====================================================

        const travel = await this.travelRepository.findOne({
          where: {
            id: snapshotItem.travelId,
          },
        });

        if (!travel) {
          continue;
        }

        if (!travel.isPaid) {
          await this.travelRepository.update(snapshotItem.travelId, {
            isPaid: true,
            paidAt: new Date(),
            transaction,
          });
        }

        successCount++;
      }

      // =========================================================
      // Estado final de la transacción
      // =========================================================

      if (payments.length > 0 && successCount === payments.length) {
        transaction.status = TransactionStatus.COMPLETED;
        transaction.completedAt = new Date();
      } else if (successCount > 0) {
        transaction.status = TransactionStatus.PARTIAL;
      } else {
        transaction.status = TransactionStatus.FAILED;
      }

      // =========================================================
      // Guardar payload completo de respuesta
      // =========================================================

      transaction.batchDetailResponse = result;

      await this.transactionRepository.save(transaction);
    }

    return response;
  }

  //? ============================================================================================== ?/

  private async prepareTransactions(): Promise<PreparedTransaction[]> {
    const preparedTransactions: PreparedTransaction[] = [];

    await this.dataSource.transaction(async (manager) => {
      // ============================================================================================
      // 1. Obtener travels pendientes con owner y cuenta bancaria
      // ============================================================================================

      const travels = await manager.find(Travel, {
        where: {
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

      if (!travels.length) {
        console.log('No hay travels pendientes de pago');
        return;
      }

      // ============================================================================================
      // 2. Agrupar travels por OWNER
      // ============================================================================================

      const travelsByOwner = new Map<number, Travel[]>();

      for (const travel of travels) {
        const owner = travel.bus?.owner;

        // Validaciones básicas
        if (!owner) {
          console.log(`Travel ${travel.id} sin owner`);
          continue;
        }

        // Crear array si no existe
        if (!travelsByOwner.has(owner.id)) {
          travelsByOwner.set(owner.id, []);
        }

        // TypeScript-safe
        const ownerTravels = travelsByOwner.get(owner.id)!;

        ownerTravels.push(travel);
      }

      // ============================================================================================
      // 3. Crear una transacción por OWNER
      // ============================================================================================

      for (const [, ownerTravels] of travelsByOwner) {
        if (!ownerTravels.length) continue;

        const owner = ownerTravels[0].bus.owner;

        // ==========================================================================================
        // Validaciones de cuenta bancaria
        // ==========================================================================================

        if (!owner.bankAccount) {
          console.log(
            `Owner ${owner.name} no tiene cuenta bancaria registrada`,
          );
          continue;
        }

        if (!owner.bankAccount.account) {
          console.log(`Owner ${owner.name} no tiene número de cuenta`);
          continue;
        }

        // ==========================================================================================
        // 4. Calcular monto total
        // ==========================================================================================

        const totalNet = ownerTravels.reduce(
          (sum, travel) => sum + Number(travel.net_to_company),
          0,
        );

        if (totalNet <= 0) {
          //console.log(`Owner ${owner.name}: monto inválido (${totalNet})`);
          continue;
        }

        // ==========================================================================================
        // 5. Crear registro de transacción
        // ==========================================================================================

        const transaction = manager.create(Transaction, {
          ownerId: owner.id,
          amount: totalNet.toString(),
          status: TransactionStatus.PENDING,

          travelsSnapshot: ownerTravels.map((travel, index) => ({
            line: index + 1,
            travelId: travel.id,
            amount: Number(travel.net_to_company),
          })),
        });

        await manager.save(transaction);

        // ==========================================================================================
        // 6. Construir payload para el banco
        // ==========================================================================================

        const payload = this.buildProcessMultiplePayload(
          owner,
          ownerTravels,
          totalNet,
        );

        // ==========================================================================================
        // 7. Guardar payload para auditoría
        // ==========================================================================================

        //transaction.requestPayload = JSON.stringify(payload);
        transaction.processRequest = payload;

        await manager.save(transaction);

        // ==========================================================================================
        // 8. Agregar al resultado final
        // ==========================================================================================

        preparedTransactions.push({
          owner,
          travels: ownerTravels,
          transaction,
          payload,
        });

        console.log(
          `📝 Preparado OWNER: ${owner.name} - ${totalNet} Bs. (${ownerTravels.length} travels)`,
        );
      }
    });

    return preparedTransactions;
  }

  //? ============================================================================================== ?/

  private buildProcessMultiplePayload(
    owner: Owner,
    travels: Travel[],
    totalNet: number,
  ): ProcessMultipleToEncrypt {
    const isBcp = owner.bankAccount.bankCode === BankCode.BANCO_DE_CREDITO;

    // NO agrupar todo en una sola línea
    const paymentLines = travels.map((travel, index) => ({
      line: index + 1,
      amount: Number(travel.net_to_company),
      travelId: travel.id,
    }));

    return {
      documentNumber: '1000029',
      documentType: 'Q',
      documentExtension: 'SN',
      documentComplement: '',
      amount: totalNet,
      currency: Currency.BOL,
      fundSource: 'Venta pasajes',
      fundDestination: `Pago a ${owner.name}`,
      sourceAccount: '7015103341336',
      sourceCurrency: Currency.BOL,
      description: `Pago automático travels`,
      sendVouchers: 'luisdiegoborja8@gmail.com',

      cismartApprovers: [
        {
          idc: '07706841-Q-XX',
          type: 1,
        },
      ],

      spreadsheet: {
        formProvidersPayments: isBcp
          ? paymentLines.map(({ line, amount, travelId }) => ({
              paymentType: PaymentType.PROV,
              line,
              accountNumber: owner.bankAccount.account,
              glossPayment: `Pago travel ${travelId}`,
              amount,
              documentType: owner.bankAccount.documentType,
              documentNumber: owner.bankAccount.documentNumber,
              documentExtension: owner.bankAccount.documentExtension,
              firstDetail: `Travel ID: ${travelId}`,
              secondDetails: '',
              mail: owner.users[0]?.email,
            }))
          : [],

        formAchPayments: !isBcp
          ? paymentLines.map(({ line, amount, travelId }) => ({
              paymentType: PaymentType.ACH,
              line,
              accountNumber: owner.bankAccount.account,
              titularName: owner.bankAccount.titularName,
              amount,
              branchOfficeId: owner.bankAccount.branchOfficeId,
              firstDetail: `Travel ID: ${travelId}`,
              mail: owner.users[0]?.email,
              bankId: owner.bankAccount.bankCode,
              documentNumber: owner.bankAccount.documentNumber,
              documentType: owner.bankAccount.documentType,
              documentExtension: owner.bankAccount.documentExtension,
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

    //console.log(response);

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

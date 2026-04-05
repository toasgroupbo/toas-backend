export class EncryptRequestDto {
  payload: any;
}

export class DecryptRequestDto {
  body: string;
}

export class BcpSignedRequestDto {
  companyId: number;
  data: string;
  signature: string;
}

export class ProcessMultipleDto {
  companyId: number;
  password: string;
  documentNumber: string;
  documentType: string;
  documentExtension: string;
  documentComplement: string;
  amount: number;
  currency: string;
  fundSource: string;
  fundDestination: string;
  sourceAccount: string;
  sourceCurrency: string;
  description: string;
  sendVouchers: string;
  cismartApprovers: Array<{ idc: string; type: number }>;
  spreadsheet: {
    formProvidersPayments: any[];
    formAchPayments: any[];
  };
}

export class AuthorizeBatchDto {
  password: string;
  companyId: number;
  TransactionsId: number[];
  UserIp: string;
  documentNumber: string;
  documentType: string;
  documentExtension: string;
  documentComplement: string;
  type: string;
}

export class GetBatchDetailDto {
  companyId: number;
  password: string;
  documentNumber: string;
  documentType: string;
  documentExtension: string;
  documentComplement: string;
  transactionsId: number[];
}

export class GetBalancesDto {
  companyId: number;
  password: string;
  documentNumber: string;
  documentType: string;
  documentExtension: string;
  documentComplement: string;
}

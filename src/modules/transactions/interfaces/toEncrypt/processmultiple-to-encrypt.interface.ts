export interface ProcessMultipleToEncrypt {
  companyId?: number;
  password?: string;

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
  cismartApprovers: CismartApprover[];
  spreadsheet: Spreadsheet;
}

export interface CismartApprover {
  idc: string;
  type: number;
}

export interface Spreadsheet {
  formProvidersPayments: FormProvidersPayment[];
  formAchPayments: FormAchPayment[];
}

export interface FormProvidersPayment {
  paymentType: string;
  line: number;
  accountNumber: string;
  glossPayment: string;
  amount: number;
  documentType: string;
  documentNumber: string;
  documentExtension: string;
  firstDetail: string;
  secondDetails: string;
  mail: string;
}

export interface FormAchPayment {
  paymentType: string;
  line: number;
  accountNumber: string;
  titularName: string;
  amount: number;
  branchOfficeId: number;
  firstDetail: string;
  mail: string;
  bankId: string;
  documentNumber: string;
  documentType: string;
  documentExtension: string;
  documentComplement: string;
}

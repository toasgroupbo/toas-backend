export interface DecryptGetBatchDetail {
  Result: Result[];
  Code: string;
  Message: string;
}

export interface Result {
  ProcessBatchId: number;
  StatusOperation: string;
  TypeOperation: string;
  Amount: number;
  SourceAccount: string;
  Currency: string;
  Description: string;
  FundSource: string;
  FundDestination: string;
  DateProcess: string;
  OperationNumberDebitHost: string;
  UserInvolveds: UserInvolved[];
  Spreadsheet: Spreadsheet;
}

export interface UserInvolved {
  UserDescription: string;
  UserName: string;
  DateAction: string;
}

export interface Spreadsheet {
  FormProvidersPayments: FormProvidersPayment[];
  FormAchPayments: FormAchPayment[];
  FormOddPayments: any[];
  FormYapePayments: any[];
}

export interface FormProvidersPayment {
  PaymentType: string;
  Line: number;
  AccountNumber: string;
  TitularName: string;
  FirstLastName: string;
  SecondLastName: string;
  Description: string;
  GlossPayment: string;
  Amount: number;
  AccountType: string;
  DocumentType: string;
  DocumentNumber: string;
  DocumentExtension: string;
  BranchOfficeId: any;
  BranchOfficeDescription: any;
  FirstDetail: string;
  SecondDetail: string;
  Mail: string;
  InstruccionsPayment: string;
  BankId: string;
  BankDescription: any;
  Commission: number;
  CommissionCurrency: string;
  OperationStatusDescription: string;
  OperationNumberDebitHost: any;
}

export interface FormAchPayment {
  PaymentType: string;
  Line: number;
  AccountNumber: string;
  TitularName: string;
  FirstLastName: string;
  SecondLastName: string;
  Description: string;
  GlossPayment: string;
  Amount: number;
  AccountType: string;
  DocumentType: string;
  DocumentNumber: string;
  DocumentExtension: string;
  BranchOfficeId: string;
  BranchOfficeDescription: string;
  FirstDetail: string;
  SecondDetail: string;
  Mail: string;
  InstruccionsPayment: string;
  BankId: string;
  BankDescription: string;
  Commission: number;
  CommissionCurrency: string;
  OperationStatusDescription: string;
  OperationNumberDebitHost: any;
}

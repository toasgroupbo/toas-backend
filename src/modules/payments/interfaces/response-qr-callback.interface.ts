export interface BcpQrCallbackDto {
  IdCorrelation: string;
  Id: number;
  ServiceCode: string;
  BusinessCode: string;
  IdQr: string;

  Eif?: string | null;
  Account?: string | null;

  Amount: number;
  Currency: string;
  Gloss: string;

  ReceiverAccount: string;
  ReceiverName: string;
  ReceiverDocument: string;
  ReceiverBank: string;

  ExpirationDate?: string | null;
  ResponseCode?: string | null;

  Status: string; // P = PROCESADO

  Request?: string | null;
  RequestDate: string;

  Response?: string | null;
  ResponseDate?: string | null;

  ResponseAch?: string | null;
  ResponseAchDate?: string | null;

  State: boolean;

  CorrelationId: string;
  Description: string;

  GenerateType: number;
  Version: string;

  SingleUse: boolean;
  OperationNumber: string;

  EnableBank?: string | null;

  City: string;
  BranchOffice: string;
  Teller: string;

  PhoneNumber: string;

  Collectors: CollectorDto[];
}

export interface CollectorDto {
  Name: string;
  Parameter?: string;
  Paremeter?: string; // viene mal escrito en la doc, pero debe contemplarse
  Value: string;
}

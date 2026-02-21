export interface QrCallbackResponse {
  Id: number;
  Eif: string;
  City: string;
  IdQr: string;
  Gloss: string;
  State: boolean;
  Amount: number;
  Status: string;
  Teller: string;
  Account: string;
  Request: string;
  Version: string;
  Currency: string;
  Response: string;
  SingleUse: boolean;
  Collectors: Collector[];
  EnableBank: string;
  Description: string;
  PhoneNumber: string;
  RequestDate: string;
  ResponseAch: string;
  ServiceCode: string;
  BranchOffice: string;
  BusinessCode: string;
  GenerateType: number;
  ReceiverBank: string;
  ReceiverName: string;
  ResponseCode: string;
  ResponseDate: string;
  CorrelationId: string;
  IdCorrelation: string;
  ExpirationDate: string;
  OperationNumber: string;
  ReceiverAccount: string;
  ResponseAchDate: string;
  ReceiverDocument: string;
}

export interface Collector {
  Name: string;
  Value: string;
  Parameter: string;
  Paremeter: string;
}

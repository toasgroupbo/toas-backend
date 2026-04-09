export interface GetBatchDetailEncrypt {
  companyId?: number;
  password?: string;
  documentNumber: string;
  documentType: string;
  documentExtension: string;
  documentComplement: string;
  transactionsId: number[];
}

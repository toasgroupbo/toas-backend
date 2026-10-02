import { BankCode } from 'src/modules/bank-accounts/enums/bank-code.enum';
import {
  BranchOfficeId,
  DocumentExtension,
  DocumentType,
} from 'src/modules/bank-accounts/entities/bank-account.entity';

//! datos del beneficiario tal como estaban al momento del pago (no cambian si se edita la cuenta o el owner).
//! los campos null solo aparecen en transacciones históricas reconstruidas desde processRequest
export interface BeneficiarySnapshot {
  ownerId: number | null;
  ownerName: string | null;
  bankCode: BankCode | null;
  account: string;
  titularName: string | null;
  documentType: DocumentType;
  documentNumber: string;
  documentExtension: DocumentExtension;
  branchOfficeId: BranchOfficeId | null;
}

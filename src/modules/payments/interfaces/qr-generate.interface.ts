export interface QrGenerate {
  IdCorrelation: string;
  amount: number;
  //currency?: string; // BOB, USD
  gloss?: string;
  //singleUse?: boolean;
  //enableBank?: string;
  //city?: string;
  //branchOffice?: string;
  //teller?: string;
  //phoneNumber?: string;
  expiration?: string; // Formato: dia/hora:minutos (ej: 01/02:00)
  collectors?: CollectorInterface[];
}

export interface CollectorInterface {
  name: string;
  parameter: string;
  value: string;
}

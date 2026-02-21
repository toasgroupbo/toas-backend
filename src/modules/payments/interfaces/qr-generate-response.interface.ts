export interface QrGenerateResponse {
  data: {
    id: number;
    qrImage: string; // Base64
    expirationDate: string; // yyyy-MM-dd HH:mm
  };
  state: string; // '00' = Correcto
  message: string;
}

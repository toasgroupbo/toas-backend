export interface ResponseBCP {
  isOk: boolean;
  message: string | null; // ← cuando isOk=false, message es string cifrado
  body: string | null; // ← cuando isOk=true, body es string cifrado
}

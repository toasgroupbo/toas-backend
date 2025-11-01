export class ResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
  status: number;
  timestamp: string;

  constructor(data: T, message = 'OK', success = true, status = 200) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.status = status;
    this.timestamp = new Date().toISOString();
  }
}

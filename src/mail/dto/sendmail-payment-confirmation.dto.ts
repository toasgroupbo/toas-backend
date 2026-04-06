/* export class SendMailPaymentConfirmationDto {
  to: any;

  orderNumber: any;
  orderDate: any;
  totalPrice: any;

  customerName: any;
  customerEmail: any;
  customerPhone: any;

  shippingAddress: any;
  shippingCity: any;
  shippingCountry: any;
} */

export class SendMailPaymentConfirmationDto {
  to: string;

  ticketNumber: string;
  ticketDate: string;
  totalPrice: number;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate: string;
  duration: string;
  terminalAddress: string;

  passengers: PassengerDto[];
}

class PassengerDto {
  name: string;
  idDni: string;
  seat: string;
  deck: string;
}

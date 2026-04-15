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
  ci: string;
  seat: string;
  deck: string;
}

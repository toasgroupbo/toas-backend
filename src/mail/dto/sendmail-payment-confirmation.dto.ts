export class SendMailPaymentConfirmationDto {
  to: string;

  ticketId: number;
  ticketNumber: string;
  ticketDate: string;
  totalPrice: number;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCi: string;

  companyName: string;
  lane: string;
  saleType: string;
  paymentMethod: string;

  origin: string;
  destination: string;
  departureDate: string;
  departureDay: string;
  departureTime: string;
  arrivalDate: string;
  duration: string;
  terminalAddress: string;
  terminalDestinationAddress: string;

  passengers: PassengerDto[];
}

class PassengerDto {
  name: string;
  ci: string;
  seat: string;
  deck: string;
  price: number;
}

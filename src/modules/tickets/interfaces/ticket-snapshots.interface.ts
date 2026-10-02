//! fotos de datos que el ticket necesita mostrar tal como estaban al momento de la venta.
//! las relaciones en vivo (billing, travel.route, travel.company) pueden cambiar después

export interface TicketBillingSnapshot {
  nombre: string;
  ci: string;
}

export interface TicketOfficeSnapshot {
  officeName: string | null;
  address: string | null;
  placeName: string | null;
}

export interface TicketTravelSnapshot {
  companyName: string | null;
  origin: TicketOfficeSnapshot;
  destination: TicketOfficeSnapshot;
}

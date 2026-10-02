import { SelectedSeatsDto } from '../dto';
import {
  TicketBillingSnapshot,
  TicketOfficeSnapshot,
  TicketTravelSnapshot,
} from '../interfaces/ticket-snapshots.interface';

import { Billing } from '../entities/billing.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';
import { Office } from 'src/modules/offices/entities/office.entity';
import { TravelSeat } from 'src/modules/travels/entities/travel-seat.entity';

//! copia asientos + pasajeros al ticket. Se vuelve a llamar cada vez que cambian los pasajeros
export function buildSeatsSnapshot(seats: TravelSeat[]): SelectedSeatsDto[] {
  return [...seats]
    .sort((a, b) => a.id - b.id)
    .map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      price: seat.price,
      passenger: seat.passenger ?? null,
    }));
}

export function buildBillingSnapshot(
  billing?: Billing | null,
): TicketBillingSnapshot | null {
  if (!billing) return null;
  return { nombre: billing.nombre, ci: billing.ci };
}

//! requiere travel con company y route.officeOrigin/officeDestination (+ place) cargados
export function buildTravelSnapshot(travel: Travel): TicketTravelSnapshot {
  const office = (o?: Office | null): TicketOfficeSnapshot => ({
    officeName: o?.name ?? null,
    address: o?.address ?? null,
    placeName: o?.place?.name ?? null,
  });

  return {
    companyName: travel.company?.name ?? null,
    origin: office(travel.route?.officeOrigin),
    destination: office(travel.route?.officeDestination),
  };
}

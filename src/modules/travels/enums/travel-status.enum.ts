export enum TravelStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',

  //! solo si la empresa tiene require_travel_approval: el cajero lo crea y el admin lo aprueba/rechaza
  PENDING_APPROVAL = 'pending_approval',
  REJECTED = 'rejected',
}

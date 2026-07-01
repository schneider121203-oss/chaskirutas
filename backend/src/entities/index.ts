// =====================================================================
// Barrel export — All entities
// =====================================================================

// Catálogos
export { Department } from './department.entity';
export { Province } from './province.entity';
export { District } from './district.entity';
export { Jurisdiction } from './jurisdiction.entity';
export { Company } from './company.entity';

// Usuarios
export { User } from './user.entity';
export { UserRoleEntity } from './user-role.entity';
export { AuthOtpCode } from './auth-otp-code.entity';
export { Passenger } from './passenger.entity';
export { TrustedContact } from './trusted-contact.entity';

// Conductores
export { Driver } from './driver.entity';
export { Vehicle } from './vehicle.entity';
export { Document } from './document.entity';

// Rutas
export { Route } from './route.entity';

// Viajes
export { Trip } from './trip.entity';
export { Booking } from './booking.entity';
export { TripLocation } from './trip-location.entity';
export { Rating } from './rating.entity';

// Pagos
export { PaymentMethodEntity } from './payment-method.entity';
export { Payment } from './payment.entity';
export { Invoice } from './invoice.entity';

// Conductor financiero
export { DriverEarning } from './driver-earning.entity';

// Incidentes
export { Incident } from './incident.entity';

// Extra secondary entities
export {
  RouteConcession,
  Stop,
  RouteGeofence,
  RouteAssignment,
  DriverExpense,
  Settlement,
  IncidentAttachment,
  Workshop,
  WorkshopService,
  B2gReport,
  B2gApiAccessLog,
  Notification,
  AuditLog,
} from './extra.entity';

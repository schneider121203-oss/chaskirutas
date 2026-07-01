import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Route } from './route.entity';
import { Jurisdiction } from './jurisdiction.entity';
import { Vehicle } from './vehicle.entity';
import { Driver } from './driver.entity';
import { User } from './user.entity';
import { Incident } from './incident.entity';
import { Booking } from './booking.entity';
import { ExpenseCategory, SettlementStatus } from '../common/enums';

@Entity({ name: 'route_concessions', schema: 'chaski' })
export class RouteConcession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'route_id' })
  routeId!: number;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route!: Route;

  @Column({ name: 'issued_by_jurisdiction_id' })
  issuedByJurisdictionId!: number;

  @ManyToOne(() => Jurisdiction)
  @JoinColumn({ name: 'issued_by_jurisdiction_id' })
  issuedByJurisdiction!: Jurisdiction;

  @Column({ name: 'resolution_number', type: 'varchar', length: 60, nullable: true })
  resolutionNumber!: string | null;

  @Column({ name: 'issued_at', type: 'date', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: Date | null;

  @Column({ name: 'document_url', type: 'varchar', length: 255, nullable: true })
  documentUrl!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

@Entity({ name: 'stops', schema: 'chaski' })
export class Stop {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'route_id' })
  routeId!: number;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route!: Route;

  @Column({ type: 'smallint' })
  sequence!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  latitude!: number;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  longitude!: number;

  @Column({ name: 'is_terminal', default: false })
  isTerminal!: boolean;
}

@Entity({ name: 'route_geofences', schema: 'chaski' })
export class RouteGeofence {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'route_id' })
  routeId!: number;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route!: Route;

  @Column({ name: 'polygon_geojson', type: 'jsonb' })
  polygonGeojson!: any;

  @Column({ name: 'tolerance_m', type: 'smallint', default: 200 })
  toleranceM!: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

@Entity({ name: 'route_assignments', schema: 'chaski' })
export class RouteAssignment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'route_id' })
  routeId!: number;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route!: Route;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id', referencedColumnName: 'userId' })
  driver!: Driver;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'NOW()' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt!: Date | null;
}

@Entity({ name: 'driver_expenses', schema: 'chaski' })
export class DriverExpense {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id', referencedColumnName: 'userId' })
  driver!: Driver;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category!: ExpenseCategory;

  @Column({ name: 'amount_pen', type: 'numeric', precision: 8, scale: 2 })
  amountPen!: number;

  @Column({ name: 'receipt_url', type: 'varchar', length: 255, nullable: true })
  receiptUrl!: string | null;

  @Column({ name: 'occurred_at', type: 'date' })
  occurredAt!: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

@Entity({ name: 'settlements', schema: 'chaski' })
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id', referencedColumnName: 'userId' })
  driver!: Driver;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: Date;

  @Column({ name: 'trips_count', type: 'int' })
  tripsCount!: number;

  @Column({ name: 'gross_pen', type: 'numeric', precision: 10, scale: 2 })
  grossPen!: number;

  @Column({ name: 'platform_fee_pen', type: 'numeric', precision: 10, scale: 2 })
  platformFeePen!: number;

  @Column({ name: 'affiliation_fee_pen', type: 'numeric', precision: 10, scale: 2 })
  affiliationFeePen!: number;

  @Column({ name: 'net_pen', type: 'numeric', precision: 10, scale: 2 })
  netPen!: number;

  @Column({ name: 'bank_name', type: 'varchar', length: 40, nullable: true })
  bankName!: string | null;

  @Column({ name: 'bank_account_masked', type: 'varchar', length: 30, nullable: true })
  bankAccountMasked!: string | null;

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.PENDIENTE })
  status!: SettlementStatus;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'bank_reference', type: 'varchar', length: 80, nullable: true })
  bankReference!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

@Entity({ name: 'incident_attachments', schema: 'chaski' })
export class IncidentAttachment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'incident_id', type: 'uuid' })
  incidentId!: string;

  @ManyToOne(() => Incident, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident!: Incident;

  @Column({ name: 'file_url', type: 'varchar', length: 255 })
  fileUrl!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 60, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'NOW()' })
  uploadedAt!: Date;
}

@Entity({ name: 'workshops', schema: 'chaski' })
export class Workshop {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address!: string | null;

  @Column({ name: 'province_id', nullable: true })
  provinceId!: number | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude!: number | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: 'discount_pct', type: 'smallint', default: 0 })
  discountPct!: number;

  @Column({ name: 'rating_avg', type: 'numeric', precision: 3, scale: 2, nullable: true })
  ratingAvg!: number | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

@Entity({ name: 'workshop_services', schema: 'chaski' })
export class WorkshopService {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'workshop_id' })
  workshopId!: number;

  @ManyToOne(() => Workshop)
  @JoinColumn({ name: 'workshop_id' })
  workshop!: Workshop;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'driver_id', referencedColumnName: 'userId' })
  driver!: Driver | null;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description!: string | null;

  @Column({ name: 'cost_pen', type: 'numeric', precision: 8, scale: 2, nullable: true })
  costPen!: number | null;

  @Column({ name: 'discount_pen', type: 'numeric', precision: 8, scale: 2, nullable: true })
  discountPen!: number | null;

  @Column({ name: 'odometer_km', type: 'int', nullable: true })
  odometerKm!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity({ name: 'b2g_reports', schema: 'chaski' })
export class B2gReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'jurisdiction_id' })
  jurisdictionId!: number;

  @ManyToOne(() => Jurisdiction)
  @JoinColumn({ name: 'jurisdiction_id' })
  jurisdiction!: Jurisdiction;

  @Column({ name: 'report_type', type: 'varchar', length: 40 })
  reportType!: string;

  @Column({ name: 'period_start', type: 'date', nullable: true })
  periodStart!: Date | null;

  @Column({ name: 'period_end', type: 'date', nullable: true })
  periodEnd!: Date | null;

  @Column({ name: 'generated_at', type: 'timestamp', default: () => 'NOW()' })
  generatedAt!: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  status!: string;

  @Column({ name: 'file_url', type: 'varchar', length: 255, nullable: true })
  fileUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  summary!: any;
}

@Entity({ name: 'b2g_api_access_log', schema: 'chaski' })
export class B2gApiAccessLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'jurisdiction_id', nullable: true })
  jurisdictionId!: number | null;

  @ManyToOne(() => Jurisdiction, { nullable: true })
  @JoinColumn({ name: 'jurisdiction_id' })
  jurisdiction!: Jurisdiction | null;

  @Column({ name: 'api_key_hash', type: 'varchar', length: 255, nullable: true })
  apiKeyHash!: string | null;

  @Column({ type: 'varchar', length: 120 })
  endpoint!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method!: string | null;

  @Column({ name: 'status_code', type: 'smallint', nullable: true })
  statusCode!: number | null;

  @Column({ name: 'request_at', type: 'timestamp', default: () => 'NOW()' })
  requestAt!: Date;

  @Column({ name: 'response_ms', type: 'int', nullable: true })
  responseMs!: number | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;
}

@Entity({ name: 'notifications', schema: 'chaski' })
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 10 })
  channel!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data!: any;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

@Entity({ name: 'audit_log', schema: 'chaski' })
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: User | null;

  @Column({ type: 'varchar', length: 60 })
  action!: string;

  @Column({ type: 'varchar', length: 40 })
  entity!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 60, nullable: true })
  entityId!: string | null;

  @Column({ name: 'before_state', type: 'jsonb', nullable: true })
  beforeState!: any;

  @Column({ name: 'after_state', type: 'jsonb', nullable: true })
  afterState!: any;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamp', default: () => 'NOW()' })
  occurredAt!: Date;
}

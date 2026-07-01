import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { IncidentType, IncidentStatus } from '../common/enums';
import { Trip } from './trip.entity';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity({ name: 'incidents', schema: 'chaski' })
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: IncidentType })
  type!: IncidentType;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId!: string | null;

  @ManyToOne(() => Trip, { nullable: true })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip | null;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking | null;

  @Column({ name: 'reporter_user_id', type: 'uuid' })
  reporterUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_user_id' })
  reporterUser!: User;

  @Column({ name: 'target_user_id', type: 'uuid', nullable: true })
  targetUserId!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamp', default: () => 'NOW()' })
  occurredAt!: Date;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude!: number | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'smallint', nullable: true })
  severity!: number | null;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.ABIERTO })
  status!: IncidentStatus;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'pnp_notified', default: false })
  pnpNotified!: boolean;

  @Column({ name: 'pnp_case_number', type: 'varchar', length: 40, nullable: true })
  pnpCaseNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt!: Date | null;
}

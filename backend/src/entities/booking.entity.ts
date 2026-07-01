import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BookingStatus } from '../common/enums';
import { Trip } from './trip.entity';
import { Passenger } from './passenger.entity';

@Entity({ name: 'bookings', schema: 'chaski' })
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId!: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Column({ name: 'passenger_id', type: 'uuid' })
  passengerId!: string;

  @ManyToOne(() => Passenger)
  @JoinColumn({ name: 'passenger_id', referencedColumnName: 'userId' })
  passenger!: Passenger;

  @Column({ name: 'seat_number', type: 'smallint' })
  seatNumber!: number;

  @Column({ name: 'pickup_stop_id', type: 'int', nullable: true })
  pickupStopId!: number | null;

  @Column({ name: 'dropoff_stop_id', type: 'int', nullable: true })
  dropoffStopId!: number | null;

  @Column({ name: 'fare_pen', type: 'numeric', precision: 6, scale: 2 })
  farePen!: number;

  @Column({ name: 'insurance_pen', type: 'numeric', precision: 6, scale: 2, default: 0 })
  insurancePen!: number;

  @Column({ name: 'platform_fee_pen', type: 'numeric', precision: 6, scale: 2, default: 0 })
  platformFeePen!: number;

  @Column({ name: 'total_pen', type: 'numeric', precision: 6, scale: 2 })
  totalPen!: number;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDIENTE })
  status!: BookingStatus;

  @Column({ name: 'booked_at', type: 'timestamp', default: () => 'NOW()' })
  bookedAt!: Date;

  @Column({ name: 'boarded_at', type: 'timestamp', nullable: true })
  boardedAt!: Date | null;

  @Column({ name: 'dropped_off_at', type: 'timestamp', nullable: true })
  droppedOffAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'varchar', length: 120, nullable: true })
  cancellationReason!: string | null;
}

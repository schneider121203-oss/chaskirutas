import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TripStatus } from '../common/enums';
import { Route } from './route.entity';
import { Vehicle } from './vehicle.entity';
import { Driver } from './driver.entity';

@Entity({ name: 'trips', schema: 'chaski' })
export class Trip {
  @PrimaryGeneratedColumn('uuid')
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

  @Column({ name: 'scheduled_departure', type: 'timestamp' })
  scheduledDeparture!: Date;

  @Column({ name: 'actual_departure', type: 'timestamp', nullable: true })
  actualDeparture!: Date | null;

  @Column({ name: 'actual_arrival', type: 'timestamp', nullable: true })
  actualArrival!: Date | null;

  @Column({ name: 'seats_total', type: 'smallint' })
  seatsTotal!: number;

  @Column({ name: 'seats_available', type: 'smallint' })
  seatsAvailable!: number;

  @Column({ name: 'base_fare_pen', type: 'numeric', precision: 6, scale: 2 })
  baseFarePen!: number;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.RESERVADO })
  status!: TripStatus;

  @Column({ name: 'started_lat', type: 'numeric', precision: 9, scale: 6, nullable: true })
  startedLat!: number | null;

  @Column({ name: 'started_lng', type: 'numeric', precision: 9, scale: 6, nullable: true })
  startedLng!: number | null;

  @Column({ name: 'ended_lat', type: 'numeric', precision: 9, scale: 6, nullable: true })
  endedLat!: number | null;

  @Column({ name: 'ended_lng', type: 'numeric', precision: 9, scale: 6, nullable: true })
  endedLng!: number | null;

  @Column({ name: 'distance_km_real', type: 'numeric', precision: 6, scale: 2, nullable: true })
  distanceKmReal!: number | null;

  @Column({ name: 'duration_minutes_real', type: 'smallint', nullable: true })
  durationMinutesReal!: number | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;
}

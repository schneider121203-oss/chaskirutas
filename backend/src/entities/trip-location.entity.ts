import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Trip } from './trip.entity';

@Entity({ name: 'trip_locations', schema: 'chaski' })
export class TripLocation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId!: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Column({ name: 'captured_at', type: 'timestamp' })
  capturedAt!: Date;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  latitude!: number;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  longitude!: number;

  @Column({ name: 'speed_kmh', type: 'numeric', precision: 5, scale: 2, nullable: true })
  speedKmh!: number | null;

  @Column({ name: 'heading_deg', type: 'smallint', nullable: true })
  headingDeg!: number | null;

  @Column({ name: 'is_inside_geofence', type: 'boolean', nullable: true })
  isInsideGeofence!: boolean | null;
}

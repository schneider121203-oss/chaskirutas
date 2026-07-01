import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Driver } from './driver.entity';
import { Trip } from './trip.entity';

@Entity({ name: 'driver_earnings', schema: 'chaski' })
export class DriverEarning {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id', referencedColumnName: 'userId' })
  driver!: Driver;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId!: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Column({ name: 'gross_pen', type: 'numeric', precision: 8, scale: 2 })
  grossPen!: number;

  @Column({ name: 'platform_fee_pen', type: 'numeric', precision: 8, scale: 2 })
  platformFeePen!: number;

  @Column({ name: 'affiliation_fee_pen', type: 'numeric', precision: 8, scale: 2 })
  affiliationFeePen!: number;

  @Column({ name: 'net_pen', type: 'numeric', precision: 8, scale: 2 })
  netPen!: number;

  @Column({ name: 'earned_at', type: 'timestamp', default: () => 'NOW()' })
  earnedAt!: Date;
}

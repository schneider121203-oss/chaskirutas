import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RouteModality } from '../common/enums';
import { Company } from './company.entity';
import { Jurisdiction } from './jurisdiction.entity';
import { District } from './district.entity';

@Entity({ name: 'routes', schema: 'chaski' })
export class Route {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'enum', enum: RouteModality })
  modality!: RouteModality;

  @Column({ name: 'company_id' })
  companyId!: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'jurisdiction_id' })
  jurisdictionId!: number;

  @ManyToOne(() => Jurisdiction)
  @JoinColumn({ name: 'jurisdiction_id' })
  jurisdiction!: Jurisdiction;

  @Column({ name: 'origin_district_id' })
  originDistrictId!: number;

  @ManyToOne(() => District)
  @JoinColumn({ name: 'origin_district_id' })
  originDistrict!: District;

  @Column({ name: 'destination_district_id' })
  destinationDistrictId!: number;

  @ManyToOne(() => District)
  @JoinColumn({ name: 'destination_district_id' })
  destinationDistrict!: District;

  @Column({ name: 'distance_km', type: 'numeric', precision: 6, scale: 2, nullable: true })
  distanceKm!: number | null;

  @Column({ name: 'estimated_minutes', type: 'smallint', nullable: true })
  estimatedMinutes!: number | null;

  @Column({ name: 'base_fare_pen', type: 'numeric', precision: 6, scale: 2 })
  baseFarePen!: number;

  @Column({ name: 'seats_per_unit', type: 'smallint', default: 4 })
  seatsPerUnit!: number;

  @Column({ name: 'is_active', default: false })
  isActive!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

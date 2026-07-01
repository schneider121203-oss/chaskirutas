import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VehicleStatus } from '../common/enums';
import { User } from './user.entity';
import { Company } from './company.entity';

@Entity({ name: 'vehicles', schema: 'chaski' })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  plate!: string;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser!: User | null;

  @Column({ name: 'owner_company_id', nullable: true })
  ownerCompanyId!: number | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany!: Company | null;

  @Column({ type: 'varchar', length: 40 })
  brand!: string;

  @Column({ type: 'varchar', length: 60 })
  model!: string;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color!: string | null;

  @Column({ name: 'seats_total', type: 'smallint' })
  seatsTotal!: number;

  @Column({ name: 'seats_for_passengers', type: 'smallint' })
  seatsForPassengers!: number;

  @Column({ name: 'fuel_type', type: 'varchar', length: 20, default: 'GASOLINA' })
  fuelType!: string;

  @Column({ name: 'odometer_km', type: 'int', nullable: true })
  odometerKm!: number | null;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.EN_REGISTRO })
  status!: VehicleStatus;

  @Column({ name: 'affiliated_company_id' })
  affiliatedCompanyId!: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'affiliated_company_id' })
  affiliatedCompany!: Company;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

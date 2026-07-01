import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { DriverStatus } from '../common/enums';

@Entity({ name: 'drivers', schema: 'chaski' })
export class Driver {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, (u) => u.driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'license_number', type: 'varchar', length: 20, unique: true })
  licenseNumber!: string;

  @Column({ name: 'license_class', type: 'varchar', length: 10 })
  licenseClass!: string;

  @Column({ name: 'license_expires_at', type: 'date' })
  licenseExpiresAt!: Date;

  @Column({ name: 'ruc_personal', type: 'char', length: 11, nullable: true })
  rucPersonal!: string | null;

  @Column({ name: 'record_status', type: 'varchar', length: 40, default: 'OK' })
  recordStatus!: string;

  @Column({ name: 'formalization_step', type: 'smallint', default: 1 })
  formalizationStep!: number;

  @Column({ name: 'formalization_pct', type: 'smallint', default: 0 })
  formalizationPct!: number;

  @Column({ name: 'rating_avg', type: 'numeric', precision: 3, scale: 2, default: 5.0 })
  ratingAvg!: number;

  @Column({ name: 'total_trips', type: 'int', default: 0 })
  totalTrips!: number;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.EN_REGISTRO })
  status!: DriverStatus;

  @Column({ name: 'bank_name', type: 'varchar', length: 40, nullable: true })
  bankName!: string | null;

  @Column({ name: 'bank_account_masked', type: 'varchar', length: 30, nullable: true })
  bankAccountMasked!: string | null;

  @Column({ name: 'bank_account_cci', type: 'varchar', length: 30, nullable: true })
  bankAccountCci!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DocumentKind } from '../common/enums';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';
import { Company } from './company.entity';

@Entity({ name: 'documents', schema: 'chaski' })
export class Document {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'enum', enum: DocumentKind })
  kind!: DocumentKind;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ name: 'company_id', nullable: true })
  companyId!: number | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company | null;

  @Column({ name: 'document_number', type: 'varchar', length: 40, nullable: true })
  documentNumber!: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 255, nullable: true })
  fileUrl!: string | null;

  @Column({ name: 'issued_at', type: 'date', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'issuing_entity', type: 'varchar', length: 80, nullable: true })
  issuingEntity!: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy!: string | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

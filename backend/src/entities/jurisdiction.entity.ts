import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { JurisdictionType } from '../common/enums';
import { Department } from './department.entity';
import { Province } from './province.entity';

@Entity({ name: 'jurisdictions', schema: 'chaski' })
export class Jurisdiction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: JurisdictionType })
  type!: JurisdictionType;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'department_id', type: 'smallint', nullable: true })
  departmentId!: number | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @Column({ name: 'province_id', nullable: true })
  provinceId!: number | null;

  @ManyToOne(() => Province, { nullable: true })
  @JoinColumn({ name: 'province_id' })
  province!: Province | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 120, nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'has_data_sharing_agreement', default: false })
  hasDataSharingAgreement!: boolean;

  @Column({ name: 'agreement_signed_at', type: 'timestamp', nullable: true })
  agreementSignedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

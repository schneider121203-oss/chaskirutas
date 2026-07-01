import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Province } from './province.entity';

@Entity({ name: 'companies', schema: 'chaski' })
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'legal_name', type: 'varchar', length: 180 })
  legalName!: string;

  @Column({ name: 'trade_name', type: 'varchar', length: 120, nullable: true })
  tradeName!: string | null;

  @Column({ type: 'char', length: 11, unique: true })
  ruc!: string;

  @Column({ name: 'legal_form', type: 'varchar', length: 20, nullable: true })
  legalForm!: string | null;

  @Column({ name: 'fiscal_address', type: 'varchar', length: 200, nullable: true })
  fiscalAddress!: string | null;

  @Column({ name: 'province_id', nullable: true })
  provinceId!: number | null;

  @ManyToOne(() => Province, { nullable: true })
  @JoinColumn({ name: 'province_id' })
  province!: Province | null;

  @Column({ name: 'legal_rep_name', type: 'varchar', length: 120, nullable: true })
  legalRepName!: string | null;

  @Column({ name: 'legal_rep_dni', type: 'varchar', length: 12, nullable: true })
  legalRepDni!: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
  contactPhone!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 120, nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InvoiceType } from '../common/enums';
import { Booking } from './booking.entity';
import { Company } from './company.entity';

@Entity({ name: 'invoices', schema: 'chaski' })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @Column({ name: 'company_id' })
  companyId!: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'enum', enum: InvoiceType, default: InvoiceType.BOLETA })
  type!: InvoiceType;

  @Column({ type: 'varchar', length: 8 })
  series!: string;

  @Column({ type: 'int' })
  number!: number;

  @Column({ name: 'issued_at', type: 'timestamp', default: () => 'NOW()' })
  issuedAt!: Date;

  @Column({ name: 'customer_doc_type', type: 'varchar', length: 8 })
  customerDocType!: string;

  @Column({ name: 'customer_doc', type: 'varchar', length: 15 })
  customerDoc!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 180 })
  customerName!: string;

  @Column({ name: 'subtotal_pen', type: 'numeric', precision: 8, scale: 2 })
  subtotalPen!: number;

  @Column({ name: 'igv_pen', type: 'numeric', precision: 8, scale: 2 })
  igvPen!: number;

  @Column({ name: 'total_pen', type: 'numeric', precision: 8, scale: 2 })
  totalPen!: number;

  @Column({ name: 'sunat_status', type: 'varchar', length: 20, default: 'PENDIENTE' })
  sunatStatus!: string;

  @Column({ name: 'sunat_response', type: 'jsonb', nullable: true })
  sunatResponse!: Record<string, unknown> | null;

  @Column({ name: 'pdf_url', type: 'varchar', length: 255, nullable: true })
  pdfUrl!: string | null;

  @Column({ name: 'xml_url', type: 'varchar', length: 255, nullable: true })
  xmlUrl!: string | null;
}

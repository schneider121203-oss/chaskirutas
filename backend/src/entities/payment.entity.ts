import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PaymentMethodType, PaymentStatus } from '../common/enums';
import { Booking } from './booking.entity';
import { PaymentMethodEntity } from './payment-method.entity';

@Entity({ name: 'payments', schema: 'chaski' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @Column({ name: 'payment_method_id', type: 'bigint', nullable: true })
  paymentMethodId!: string | null;

  @ManyToOne(() => PaymentMethodEntity, { nullable: true })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod!: PaymentMethodEntity | null;

  @Column({ type: 'enum', enum: PaymentMethodType })
  method!: PaymentMethodType;

  @Column({ name: 'amount_pen', type: 'numeric', precision: 8, scale: 2 })
  amountPen!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDIENTE })
  status!: PaymentStatus;

  @Column({ name: 'psp_provider', type: 'varchar', length: 40, nullable: true })
  pspProvider!: string | null;

  @Column({ name: 'psp_transaction_id', type: 'varchar', length: 80, nullable: true })
  pspTransactionId!: string | null;

  @Column({ name: 'psp_response', type: 'jsonb', nullable: true })
  pspResponse!: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

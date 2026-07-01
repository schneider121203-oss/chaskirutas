import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PaymentMethodType } from '../common/enums';
import { User } from './user.entity';

@Entity({ name: 'payment_methods', schema: 'chaski' })
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: PaymentMethodType })
  method!: PaymentMethodType;

  @Column({ type: 'varchar', length: 40, nullable: true })
  provider!: string | null;

  @Column({ name: 'masked_label', type: 'varchar', length: 40, nullable: true })
  maskedLabel!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  token!: string | null;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

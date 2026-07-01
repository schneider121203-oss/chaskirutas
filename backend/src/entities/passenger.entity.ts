import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'passengers', schema: 'chaski' })
export class Passenger {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, (u) => u.passenger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'rating_avg', type: 'numeric', precision: 3, scale: 2, default: 5.0 })
  ratingAvg!: number;

  @Column({ name: 'total_trips', type: 'int', default: 0 })
  totalTrips!: number;

  @Column({ name: 'preferred_payment_method_id', type: 'bigint', nullable: true })
  preferredPaymentMethodId!: string | null;

  @Column({ name: 'home_address', type: 'varchar', length: 200, nullable: true })
  homeAddress!: string | null;

  @Column({ name: 'work_address', type: 'varchar', length: 200, nullable: true })
  workAddress!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

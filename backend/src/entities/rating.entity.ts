import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity({ name: 'ratings', schema: 'chaski' })
export class Rating {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @Column({ name: 'rater_user_id', type: 'uuid' })
  raterUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'rater_user_id' })
  raterUser!: User;

  @Column({ name: 'rated_user_id', type: 'uuid' })
  ratedUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'rated_user_id' })
  ratedUser!: User;

  @Column({ name: 'role_of_rater', type: 'varchar', length: 10 })
  roleOfRater!: string;

  @Column({ type: 'smallint' })
  score!: number;

  @Column({ type: 'text', array: true, nullable: true })
  tags!: string[] | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

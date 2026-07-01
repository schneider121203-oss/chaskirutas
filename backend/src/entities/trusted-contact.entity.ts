import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Passenger } from './passenger.entity';

@Entity({ name: 'trusted_contacts', schema: 'chaski' })
export class TrustedContact {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'passenger_id', type: 'uuid' })
  passengerId!: string;

  @ManyToOne(() => Passenger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passenger_id', referencedColumnName: 'userId' })
  passenger!: Passenger;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  relationship!: string | null;

  @Column({ name: 'phone_e164', type: 'varchar', length: 20 })
  phoneE164!: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;
}

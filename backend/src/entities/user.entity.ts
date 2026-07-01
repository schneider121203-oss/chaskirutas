import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { UserStatus } from '../common/enums';
import { UserRoleEntity } from './user-role.entity';
import { Passenger } from './passenger.entity';
import { Driver } from './driver.entity';

@Entity({ name: 'users', schema: 'chaski' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true, nullable: true })
  email!: string | null;

  @Column({ name: 'phone_e164', type: 'varchar', length: 20, unique: true })
  phoneE164!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 160 })
  fullName!: string;

  @Column({ type: 'varchar', length: 12, unique: true })
  dni!: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate!: Date | null;

  @Column({ name: 'photo_url', type: 'varchar', length: 255, nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDIENTE })
  status!: UserStatus;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: 'phone_verified_at', type: 'timestamp', nullable: true })
  phoneVerifiedAt!: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => UserRoleEntity, (r) => r.user, { eager: true })
  roles!: UserRoleEntity[];

  @OneToOne(() => Passenger, (p) => p.user)
  passenger!: Passenger;

  @OneToOne(() => Driver, (d) => d.user)
  driver!: Driver;
}

import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_roles', schema: 'chaski' })
export class UserRoleEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  role!: string;

  @Column({ name: 'granted_at', type: 'timestamp', default: () => 'NOW()' })
  grantedAt!: Date;

  @ManyToOne(() => User, (u) => u.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

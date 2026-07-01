import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Province } from './province.entity';

@Entity({ name: 'districts', schema: 'chaski' })
export class District {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'province_id' })
  provinceId!: number;

  @ManyToOne(() => Province, (p) => p.districts)
  @JoinColumn({ name: 'province_id' })
  province!: Province;

  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;
}

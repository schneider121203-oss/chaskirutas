import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Province } from './province.entity';
import { Jurisdiction } from './jurisdiction.entity';

@Entity({ name: 'departments', schema: 'chaski' })
export class Department {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 4, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  name!: string;

  @OneToMany(() => Province, (p) => p.department)
  provinces!: Province[];

  @OneToMany(() => Jurisdiction, (j) => j.department)
  jurisdictions!: Jurisdiction[];
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Department } from './department.entity';
import { District } from './district.entity';

@Entity({ name: 'provinces', schema: 'chaski' })
export class Province {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'department_id', type: 'smallint' })
  departmentId!: number;

  @ManyToOne(() => Department, (d) => d.provinces)
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  @Column({ type: 'varchar', length: 8, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @OneToMany(() => District, (d) => d.province)
  districts!: District[];
}

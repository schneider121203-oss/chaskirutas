import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department, Province, District, Jurisdiction } from '../entities';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Province)
    private readonly provinceRepo: Repository<Province>,
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
    @InjectRepository(Jurisdiction)
    private readonly jurisdictionRepo: Repository<Jurisdiction>,
  ) {}

  async getDepartments() {
    return this.departmentRepo.find({ order: { name: 'ASC' } });
  }

  async getProvinces(departmentId: number) {
    return this.provinceRepo.find({
      where: { departmentId },
      order: { name: 'ASC' },
    });
  }

  async getDistricts(provinceId: number) {
    return this.districtRepo.find({
      where: { provinceId },
      order: { name: 'ASC' },
    });
  }

  async getJurisdictions() {
    return this.jurisdictionRepo.find({ order: { name: 'ASC' } });
  }
}

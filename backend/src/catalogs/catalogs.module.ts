import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { Department, Province, District, Jurisdiction } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Province, District, Jurisdiction])],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}

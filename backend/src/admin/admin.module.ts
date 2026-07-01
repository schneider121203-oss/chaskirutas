import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, Driver, Document, Trip, Route, Incident } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Driver, Document, Trip, Route, Incident])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectivesController } from './collectives.controller';
import { CollectivesService } from './collectives.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { Route, Trip, Booking, Passenger } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, Trip, Booking, Passenger]),
    IntegrationsModule,
  ],
  controllers: [CollectivesController],
  providers: [CollectivesService],
  exports: [CollectivesService],
})
export class CollectivesModule {}

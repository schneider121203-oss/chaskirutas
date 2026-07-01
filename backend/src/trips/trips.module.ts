import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PricingService } from './pricing.service';
import { TripsGateway } from './trips.gateway';
import { IntegrationsModule } from '../integrations/integrations.module';
import { Trip, Booking, TripLocation, Rating, Route, User, DriverEarning, Invoice, Company } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      Booking,
      TripLocation,
      Rating,
      Route,
      User,
      DriverEarning,
      Invoice,
      Company,
    ]),
    IntegrationsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, PricingService, TripsGateway],
  exports: [TripsService, PricingService, TripsGateway],
})
export class TripsModule {}

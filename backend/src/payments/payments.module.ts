import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PaymentMethodEntity, Payment, Booking, Invoice } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethodEntity, Payment, Booking, Invoice]),
    IntegrationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

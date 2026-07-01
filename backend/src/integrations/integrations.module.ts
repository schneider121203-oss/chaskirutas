import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReniecService } from './reniec.service';
import { CulqiService } from './culqi.service';
import { NubefactService } from './nubefact.service';

@Module({
  imports: [ConfigModule],
  providers: [ReniecService, CulqiService, NubefactService],
  exports: [ReniecService, CulqiService, NubefactService],
})
export class IntegrationsModule {}

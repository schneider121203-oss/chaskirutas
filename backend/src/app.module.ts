import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { DriversModule } from './drivers/drivers.module';
import { TripsModule } from './trips/trips.module';
import { CollectivesModule } from './collectives/collectives.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    // Global Config Module loading env vars
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database connection using TypeORM PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL') || 'postgresql://chaski_dba:Ch4sk1Rut4s_2026!@localhost:5432/chaskirutas',
        schema: 'chaski',
        autoLoadEntities: true,
        synchronize: false, // Schema is managed directly via SQL DDL script
        ssl: config.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // Features
    IntegrationsModule,
    AuthModule,
    UsersModule,
    CatalogsModule,
    DriversModule,
    TripsModule,
    CollectivesModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}

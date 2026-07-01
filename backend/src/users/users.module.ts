import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, Passenger, TrustedContact } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Passenger, TrustedContact])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

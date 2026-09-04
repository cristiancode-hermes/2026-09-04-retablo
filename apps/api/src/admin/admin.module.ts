import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playbill, Show, ShowFunction, Zone } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Show, ShowFunction, Zone, Playbill]), AuthModule],
  controllers: [AdminController],
})
export class AdminModule {}

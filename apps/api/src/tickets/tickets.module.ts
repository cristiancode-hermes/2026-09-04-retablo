import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Playbill,
  ScanEvent,
  Seat,
  SeatLock,
  Show,
  ShowFunction,
  Ticket,
  TicketLine,
  User,
} from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketLine,
      ShowFunction,
      Show,
      Seat,
      SeatLock,
      Playbill,
      ScanEvent,
      User,
    ]),
    AuthModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

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
  Zone,
} from '../entities/entities';
import { TicketsModule } from '../tickets/tickets.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Show,
      ShowFunction,
      Zone,
      Seat,
      Playbill,
      Ticket,
      TicketLine,
      SeatLock,
      ScanEvent,
    ]),
    TicketsModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}

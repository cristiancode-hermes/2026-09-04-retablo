import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';
import { StaffController } from './staff.controller';

@Module({
  imports: [AuthModule, TicketsModule],
  controllers: [StaffController],
})
export class StaffModule {}

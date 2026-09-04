import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';
import { CurrentUser } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';
import { TicketsService } from '../tickets/tickets.service';

export class ScanDto {
  @ApiProperty()
  @IsString()
  codeOrUrl!: string;

  @ApiProperty()
  @IsIn(['seated', 'interval', 'ended'])
  action!: 'seated' | 'interval' | 'ended';

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['self', 'staff'])
  voice?: 'self' | 'staff';
}

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller()
export class StaffController {
  constructor(private readonly tickets: TicketsService) {}

  @Post('staff/scan')
  scan(@CurrentUser() user: AuthUser, @Body() dto: ScanDto) {
    return this.tickets.scan(user.userId, dto);
  }

  @Get('staff/today')
  today() {
    return this.tickets.today();
  }

  @Get('stats/ended')
  ended(@Query('days') days?: number) {
    return this.tickets.endedSeries(Number(days) || 14);
  }
}

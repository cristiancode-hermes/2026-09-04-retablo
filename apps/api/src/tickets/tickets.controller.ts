import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';

export class CheckoutDto {
  @ApiProperty()
  @IsString()
  functionId!: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  seatIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  playbillQty?: number;
}

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.tickets.checkout(user.userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.tickets.listMine(user.userId);
  }

  @Get('by-code/:code')
  byCode(@Param('code') code: string) {
    return this.tickets.getPublic(code);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tickets.getMine(user.userId, id);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tickets.cancel(user.userId, id);
  }
}

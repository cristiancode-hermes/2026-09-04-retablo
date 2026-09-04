import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from './entities/entities';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { TicketsModule } from './tickets/tickets.module';
import { StaffModule } from './staff/staff.module';
import { AdminModule } from './admin/admin.module';
import { SeedModule } from './seed/seed.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('DATABASE_TYPE', 'better-sqlite3');
        if (dbType === 'postgres') {
          return {
            type: 'postgres' as const,
            url: config.get<string>('DATABASE_URL'),
            entities: ALL_ENTITIES,
            synchronize: config.get('TYPEORM_SYNC', 'true') === 'true',
            ssl:
              config.get('DATABASE_SSL', 'true') === 'true'
                ? { rejectUnauthorized: false }
                : false,
          };
        }
        return {
          type: 'better-sqlite3' as const,
          database: config.get<string>('DATABASE_PATH', 'data/retablo.db'),
          entities: ALL_ENTITIES,
          synchronize: true,
        };
      },
    }),
    AuthModule,
    CatalogModule,
    TicketsModule,
    StaffModule,
    AdminModule,
    SeedModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

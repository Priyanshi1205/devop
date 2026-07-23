import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ForecastingService } from './forecasting.service';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ForecastingService, ReportingService, PrismaService],
  exports: [AnalyticsService, ForecastingService, ReportingService],
})
export class AnalyticsModule {}

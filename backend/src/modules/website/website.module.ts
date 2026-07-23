import { Module } from '@nestjs/common';
import { WebsiteService } from './website.service';
import { WebsiteController } from './website.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GscSyncService } from './gsc-sync.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AnalyticsModule, AuditModule],
  controllers: [WebsiteController],
  providers: [WebsiteService, GscSyncService, PrismaService],
  exports: [WebsiteService, GscSyncService],
})
export class WebsiteModule {}

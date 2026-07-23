import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { WebsiteModule } from './modules/website/website.module';
import { AuditModule } from './modules/audit/audit.module';
import { KeywordModule } from './modules/keyword/keyword.module';
import { CompetitorModule } from './modules/competitor/competitor.module';
import { GeoModule } from './modules/geo/geo.module';
import { LlmModule } from './modules/llm/llm.module';
import { ContentModule } from './modules/content/content.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ProjectModule } from './modules/project/project.module';
import { BacklinkModule } from './modules/backlink/backlink.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.production.local', '.env.local', '.env'] }),
    AuthModule,
    UserModule,
    OrganizationModule,
    WebsiteModule,
    ProjectModule,
    AuditModule,
    KeywordModule,
    CompetitorModule,
    GeoModule,
    LlmModule,
    ContentModule,
    ReportingModule,
    BillingModule,
    AnalyticsModule,
    BacklinkModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

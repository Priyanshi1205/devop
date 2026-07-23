import { Controller, Get, Post, Body, Query, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Google Analytics 4')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('properties')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'List all GA4 properties connected to organization accounts' })
  @ApiResponse({ status: 200, description: 'Connected property details returned' })
  async getProperties(@CurrentUser() user: UserPayload) {
    return this.analyticsService.getProperties(user.organizationId);
  }

  @Post('connect')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Map a GA4 Property to an active website domain context' })
  @ApiResponse({ status: 200, description: 'Property mapping configured successfully' })
  async connectProperty(
    @Body('websiteId', ParseUUIDPipe) websiteId: string,
    @Body('propertyId') propertyId: string,
    @Body('displayName') displayName: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.analyticsService.connectProperty(websiteId, propertyId, displayName, user.organizationId);
  }

  @Post('sync')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Trigger a manual historical data sync for a connected GA4 property' })
  @ApiResponse({ status: 200, description: 'GA4 metrics, events, and goals synced and stored' })
  async syncGa4(
    @Body('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.analyticsService.syncGa4Data(propertyId, user.organizationId);
  }

  @Get('overview/:websiteId')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get aggregated active metrics ratios for a website context' })
  @ApiResponse({ status: 200, description: 'Aggregated overview metrics' })
  async getOverview(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.analyticsService.getOverview(websiteId, user.organizationId);
  }

  @Get('traffic/:websiteId')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get daily session time-series charts, country device splits, and traffic forecast' })
  @ApiResponse({ status: 200, description: 'Traffic history, breakdowns, and forecasts' })
  async getTraffic(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<any> {
    return this.analyticsService.getTraffic(websiteId, user.organizationId);
  }

  @Get('conversions/:websiteId')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get conversion logs and milestones list' })
  @ApiResponse({ status: 200, description: 'Conversion summary metrics' })
  async getConversions(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.analyticsService.getConversions(websiteId, user.organizationId);
  }

  @Get('landing-pages/:websiteId')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get landing pages traffic and performance' })
  @ApiResponse({ status: 200, description: 'Landing page performance stats' })
  async getLandingPages(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.analyticsService.getLandingPages(websiteId, user.organizationId);
  }

  @Get('seo-performance')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get merged Google Search Console and GA4 daily timelines, forecasts, and growth digests' })
  @ApiResponse({ status: 200, description: 'Combined GSC + GA4 performance analytics' })
  async getSeoPerformance(
    @Query('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<any> {
    return this.analyticsService.getSeoPerformance(websiteId, user.organizationId);
  }
}

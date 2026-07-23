import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, Res, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { WebsiteService } from './website.service';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnalyticsService } from '../analytics/analytics.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BillingService } from '../billing/billing.service';

@ApiTags('Websites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class WebsiteController {
  constructor(
    private websiteService: WebsiteService,
    private analyticsService: AnalyticsService,
    private billingService: BillingService,
  ) {}

  @Get('projects/:projectId/dashboard/stats')
  @RequirePermissions('project:read')
  @ApiOperation({ summary: 'Get aggregated dashboard stats for a project/website context' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics returned successfully' })
  async getDashboardStats(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('websiteId') websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.getDashboardStats(projectId, websiteId || undefined, user.organizationId);
  }

  @Get('projects/:projectId/websites')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'List all websites tracked in a project' })
  @ApiResponse({ status: 200, description: 'Websites returned successfully' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.findAll(projectId, user.organizationId);
  }

  @Get('websites/:id')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get a single website detail' })
  @ApiResponse({ status: 200, description: 'Website details found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.findOne(id, user.organizationId);
  }

  @Post('websites')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Track a new website domain' })
  @ApiResponse({ status: 201, description: 'Website added' })
  async create(
    @Body() createWebsiteDto: CreateWebsiteDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.verifyWebsiteLimit(user.userId, user.organizationId);
    return this.websiteService.create(createWebsiteDto, user.organizationId);
  }

  @Delete('websites/:id')
  @RequirePermissions('website:delete')
  @ApiOperation({ summary: 'Remove a website domain from tracking' })
  @ApiResponse({ status: 200, description: 'Website deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.remove(id, user.organizationId);
  }

  @Patch('websites/:id')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Update website campaign project assignment' })
  @ApiResponse({ status: 200, description: 'Website reassigned successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.update(id, projectId, user.organizationId);
  }

  // --- GOOGLE OAUTH FLOW ENDPOINTS ---

  @Get('config/google')
  @ApiOperation({ summary: 'Get Google OAuth configuration status' })
  async getGoogleConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('mock') || clientId.includes('dummy')) {
      throw new BadRequestException('Google OAuth credentials not configured in backend.');
    }
    return {
      isConfigured: true,
      clientId: clientId
    };
  }

  @Get('websites/:id/google/oauth/url')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Generate Google OAuth authorize URL for a website domain' })
  @ApiResponse({ status: 200, description: 'OAuth URL generated' })
  async getOAuthUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('redirectPath') redirectPath: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.getGoogleOAuthUrl(id, user.organizationId, redirectPath);
  }

  @Get('websites/google/oauth/callback')
  @ApiOperation({ summary: 'Google OAuth callback handler redirecting back to frontend' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const outcome = await this.websiteService.handleGoogleOAuthCallback(code, state);
    const redirectPath = outcome.redirectPath || '/websites';
    res.redirect(`http://localhost:3000${redirectPath}?gsc_connected=true&websiteId=${outcome.websiteId}`);
  }

  @Post('websites/:id/sync/gsc')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Trigger a manual historical data sync with Google Search Console' })
  @ApiResponse({ status: 200, description: 'GSC data successfully synced' })
  async syncGsc(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.syncGscData(id, user.organizationId);
  }

  @Post('websites/:id/google/sync-all')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Trigger a complete manual background sync of GSC, GA4, and GBP services' })
  @ApiResponse({ status: 200, description: 'Google services sync successfully triggered' })
  async syncAllGoogleServices(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.websiteService.autoSyncGoogleData(id, user.organizationId);
    return { success: true, message: 'Google Search Console, GA4, and GBP profiles synced successfully!' };
  }

  @Get('websites/:id/google/gsc-properties')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get all verified properties from Google Search Console' })
  @ApiResponse({ status: 200, description: 'Verified GSC properties returned' })
  async getGscProperties(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.getGscProperties(id, user.organizationId, user.email);
  }

  @Get('websites/:id/google/ga4-properties')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get all accessible Google Analytics 4 properties' })
  @ApiResponse({ status: 200, description: 'Accessible GA4 properties returned' })
  async getGa4Properties(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.analyticsService.getGa4PropertiesForWebsite(id, user.organizationId);
  }

  @Post('websites/:id/google/gsc-property')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Map GSC property domain to website' })
  @ApiResponse({ status: 200, description: 'Website mapped successfully' })
  async connectGscProperty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('gscPropertyUrl') gscPropertyUrl: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.connectGscProperty(id, gscPropertyUrl, user.organizationId);
  }

  @Post('websites/:id/google/gsc-disconnect')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Disconnect GSC property from website' })
  @ApiResponse({ status: 200, description: 'Website disconnected successfully' })
  async disconnectGsc(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.disconnectGsc(id, user.organizationId);
  }

  @Post('websites/:id/google/ga4-disconnect')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Disconnect GA4 property from website' })
  @ApiResponse({ status: 200, description: 'Website GA4 mapping disconnected successfully' })
  async disconnectGa4(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.analyticsService.disconnectGa4(id, user.organizationId);
  }

  // --- ANALYTICS RETRIEVAL ENDPOINTS ---

  @Get('websites/:id/analytics/gsc')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get Google Search Console analytics details' })
  @ApiResponse({ status: 200, description: 'Search Console stats returned' })
  async getGscAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.findGscData(id, user.organizationId);
  }

  @Get('websites/:id/analytics/ga4')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get Google Analytics 4 performance details' })
  @ApiResponse({ status: 200, description: 'GA4 stats returned' })
  async getGa4Analytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.websiteService.findGa4Data(id, user.organizationId);
  }

  @Get('websites/:id/analytics/gmb')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get Google Business Profile maps performance details' })
  @ApiResponse({ status: 200, description: 'GMB profile stats returned' })
  async getGmbAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication session context is missing or invalid');
    }
    await this.billingService.checkPlanAccess(user.userId, 'local_seo');
    return this.websiteService.findGmbData(id, user.organizationId);
  }

  @Post('websites/:id/analytics/gmb/sync')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Sync Google Business Profiles and locations data' })
  @ApiResponse({ status: 200, description: 'GMB profiles synced successfully' })
  async syncGmbProfiles(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication session context is missing or invalid');
    }
    await this.billingService.checkPlanAccess(user.userId, 'local_seo');
    return this.websiteService.syncGmbData(id, user.organizationId);
  }

  @Post('websites/:id/analytics/gmb/reviews/reply-draft')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Generate AI draft response for a GBP customer review' })
  async generateGmbReviewReplyDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reviewer: string; text: string; rating: number; projectName?: string },
    @CurrentUser() user: UserPayload,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication session context is missing or invalid');
    }
    await this.billingService.checkPlanAccess(user.userId, 'local_seo');
    const draft = await this.websiteService.generateGmbReviewReplyDraft(
      body.reviewer,
      body.text,
      body.rating,
      body.projectName
    );
    return { draft };
  }

  @Post('websites/:id/analytics/gmb/reviews/reply')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Post response to a Google Business Profile review' })
  async postGmbReviewReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { locationName: string; reviewId: string; replyText: string },
    @CurrentUser() user: UserPayload,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication session context is missing or invalid');
    }
    await this.billingService.checkPlanAccess(user.userId, 'local_seo');
    return this.websiteService.postGmbReviewReply(
      id,
      body.locationName || 'accounts/113271606670470528955/locations/location1',
      body.reviewId,
      body.replyText,
      user.organizationId
    );
  }

  @Post('websites/:id/analytics/gmb/ai-content')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Generate AI business description, Q&As, and post ideas for GBP' })
  async generateGmbAiContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { profileName: string; category: string },
    @CurrentUser() user: UserPayload,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication session context is missing or invalid');
    }
    await this.billingService.checkPlanAccess(user.userId, 'local_seo');
    return this.websiteService.generateGmbAiContent(
      body.profileName || 'Airen Group Project',
      body.category || 'Real Estate Developer'
    );
  }

  // --- GOOGLE TAG MANAGER ENDPOINTS ---

  @Post('websites/:id/google/gtm/connect')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Connect Google Tag Manager container' })
  @ApiResponse({ status: 200, description: 'GTM container successfully connected' })
  async connectGtm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('gtmContainerId') gtmContainerId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'gtm');
    return this.websiteService.connectGtmContainer(id, gtmContainerId, user.organizationId);
  }

  @Post('websites/:id/google/gtm/disconnect')
  @RequirePermissions('website:create')
  @ApiOperation({ summary: 'Disconnect Google Tag Manager container' })
  @ApiResponse({ status: 200, description: 'GTM container successfully disconnected' })
  async disconnectGtm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'gtm');
    return this.websiteService.disconnectGtmContainer(id, user.organizationId);
  }

  @Get('websites/:id/google/gtm/details')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'Get Google Tag Manager container details and health checks' })
  @ApiResponse({ status: 200, description: 'GTM container details returned' })
  async getGtmDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'gtm');
    return this.websiteService.getGtmDetails(id, user.organizationId);
  }
}

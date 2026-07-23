import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompetitorService } from './competitor.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BillingService } from '../billing/billing.service';

@ApiTags('Competitors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class CompetitorController {
  constructor(
    private competitorService: CompetitorService,
    private billingService: BillingService,
  ) {}

  @Get('projects/:projectId/competitors')
  @RequirePermissions('competitor:read')
  @ApiOperation({ summary: 'List all competitors tracked in a project' })
  @ApiResponse({ status: 200, description: 'Competitors returned' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'competitor');
    return this.competitorService.findAll(projectId, user.organizationId);
  }

  @Post('competitors')
  @RequirePermissions('competitor:write')
  @ApiOperation({ summary: 'Track a new competitor domain' })
  @ApiResponse({ status: 201, description: 'Competitor added' })
  async create(
    @Body() dto: CreateCompetitorDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'competitor');
    return this.competitorService.create(dto, user.organizationId);
  }

  @Delete('competitors/:id')
  @RequirePermissions('competitor:delete')
  @ApiOperation({ summary: 'Stop tracking a competitor domain' })
  @ApiResponse({ status: 200, description: 'Competitor deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'competitor');
    return this.competitorService.remove(id, user.organizationId);
  }

  @Get('projects/:projectId/competitors/gap')
  @RequirePermissions('competitor:read')
  @ApiOperation({ summary: 'Calculate SEO content keyword gaps against competitors' })
  @ApiResponse({ status: 200, description: 'Content gaps retrieved' })
  async findContentGap(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'competitor');
    return this.competitorService.findContentGap(projectId, user.organizationId);
  }

  @Post('projects/:projectId/competitors/discover')
  @RequirePermissions('competitor:write')
  @ApiOperation({ summary: 'Auto-discover competitor domains for a project website' })
  @ApiResponse({ status: 201, description: 'Competitors discovered' })
  async discover(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'competitor');
    return this.competitorService.discoverCompetitors(projectId, user.organizationId);
  }

  @Get('projects/:projectId/competitors/insights')
  @RequirePermissions('competitor:read')
  @ApiOperation({ summary: 'Get AI-powered competitor analysis and recommendations' })
  @ApiResponse({ status: 200, description: 'AI insights returned' })
  async getInsights(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'competitor');
    return this.competitorService.getInsights(projectId, user.organizationId);
  }
}

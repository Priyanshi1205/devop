import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GeoService } from './geo.service';
import { CalculateGeoDto } from './dto/calculate-geo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BillingService } from '../billing/billing.service';

@ApiTags('GEO Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class GeoController {
  constructor(
    private geoService: GeoService,
    private billingService: BillingService,
  ) {}

  @Get('keywords/:keywordId/geo-scores')
  @RequirePermissions('geo:read')
  @ApiOperation({ summary: 'List all GEO scores evaluated for a keyword' })
  @ApiResponse({ status: 200, description: 'GEO scores returned' })
  async findAll(
    @Param('keywordId', ParseUUIDPipe) keywordId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'geo');
    return this.geoService.findAll(keywordId, user.organizationId);
  }

  @Post('geo-scores')
  @RequirePermissions('geo:write')
  @ApiOperation({ summary: 'Trigger GEO score evaluation metrics' })
  @ApiResponse({ status: 201, description: 'GEO score evaluated' })
  async calculate(
    @Body() dto: CalculateGeoDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'geo');
    return this.geoService.calculate(dto, user.organizationId);
  }

  @Get('projects/:projectId/geo-files')
  @RequirePermissions('geo:read')
  @ApiOperation({ summary: 'Get generated GEO files for a project website' })
  @ApiResponse({ status: 200, description: 'GEO files retrieved' })
  async getGeoFiles(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'geo');
    return this.geoService.getGeoFiles(projectId, user.organizationId);
  }

  @Post('projects/:projectId/geo-files/generate')
  @RequirePermissions('geo:write')
  @ApiOperation({ summary: 'Generate GEO files for a project website' })
  @ApiResponse({ status: 201, description: 'GEO files generated' })
  async generateGeoFiles(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'geo');
    return this.geoService.generateGeoFiles(projectId, user.organizationId);
  }
}

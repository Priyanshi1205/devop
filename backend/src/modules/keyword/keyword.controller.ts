import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KeywordService } from './keyword.service';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BillingService } from '../billing/billing.service';

@ApiTags('Keywords & Clusters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class KeywordController {
  constructor(
    private keywordService: KeywordService,
    private billingService: BillingService,
  ) {}

  @Get('websites/:websiteId/keywords')
  @RequirePermissions('keyword:read')
  @ApiOperation({ summary: 'List all keywords tracked for a website' })
  @ApiResponse({ status: 200, description: 'Keywords list returned' })
  async findAll(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.keywordService.findAll(websiteId, user.organizationId);
  }

  @Post('websites/:websiteId/keywords/discover')
  @RequirePermissions('keyword:write')
  @ApiOperation({ summary: 'Run keyword discovery from a seed word using DataForSEO' })
  @ApiResponse({ status: 201, description: 'Keywords successfully discovered and stored' })
  async discover(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @Body('keyword') keyword: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.verifyKeywordLimit(user.userId, user.organizationId);
    return this.keywordService.discover(websiteId, keyword, user.organizationId);
  }

  @Post('websites/:websiteId/keywords/ai-suggest')
  @RequirePermissions('keyword:write')
  @ApiOperation({ summary: 'Generate seed keywords using AI based on a prompt description' })
  @ApiResponse({ status: 201, description: 'Seeds successfully suggested' })
  async aiSuggest(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @Body('prompt') prompt: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.verifyKeywordLimit(user.userId, user.organizationId);
    return this.keywordService.aiSuggest(websiteId, prompt, user.organizationId);
  }

  @Get('websites/:websiteId/keywords/clusters')
  @RequirePermissions('keyword:read')
  @ApiOperation({ summary: 'List all topic clusters and content silos for a website' })
  @ApiResponse({ status: 200, description: 'Clusters list returned' })
  async findClustersForWebsite(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.keywordService.findClustersForWebsite(websiteId, user.organizationId);
  }

  @Post('keywords')
  @RequirePermissions('keyword:write')
  @ApiOperation({ summary: 'Add a new keyword to track' })
  @ApiResponse({ status: 201, description: 'Keyword added' })
  async create(
    @Body() dto: CreateKeywordDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.verifyKeywordLimit(user.userId, user.organizationId);
    return this.keywordService.create(dto, user.organizationId);
  }

  @Delete('keywords/:id')
  @RequirePermissions('keyword:delete')
  @ApiOperation({ summary: 'Stop tracking a keyword' })
  @ApiResponse({ status: 200, description: 'Keyword removed' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.keywordService.remove(id, user.organizationId);
  }

  @Post('keyword-clusters')
  @RequirePermissions('keyword:write')
  @ApiOperation({ summary: 'Create a new keyword cluster group' })
  @ApiResponse({ status: 201, description: 'Cluster created' })
  async createCluster(@Body('name') name: string) {
    return this.keywordService.createCluster(name);
  }

  @Get('keyword-clusters')
  @RequirePermissions('keyword:read')
  @ApiOperation({ summary: 'List all keyword clusters' })
  @ApiResponse({ status: 200, description: 'Clusters list returned' })
  async findAllClusters() {
    return this.keywordService.findAllClusters();
  }

  @Get('websites/:websiteId/keywords/rank-tracker')
  @RequirePermissions('keyword:read')
  @ApiOperation({ summary: 'Get rank tracker data for tracked keywords' })
  @ApiResponse({ status: 200, description: 'Rank tracker data returned' })
  async getRankTracker(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.keywordService.getRankTrackerData(websiteId, user.organizationId);
  }

  @Get('websites/:websiteId/keywords/rank-tracker/export')
  @RequirePermissions('keyword:read')
  @ApiOperation({ summary: 'Export rank tracker data as CSV' })
  async exportRankTracker(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
    @Res() res: any,
  ) {
    const data = await this.keywordService.getRankTrackerData(websiteId, user.organizationId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=rank-tracker-${websiteId}.csv`);
    
    let csvContent = 'Keyword,Current Rank (GSC),Previous Rank (GSC),Rank Change\n';
    
    for (const item of data) {
      const keyword = `"${item.text.replace(/"/g, '""')}"`;
      const currentRank = item.currentRank !== null ? item.currentRank : 'N/A';
      const previousRank = item.previousRank !== null ? item.previousRank : 'N/A';
      let change = 'N/A';
      if (item.change !== null) {
        change = item.change > 0 ? `+${item.change}` : `${item.change}`;
      }
      
      csvContent += `${keyword},${currentRank},${previousRank},${change}\n`;
    }
    
    res.send(csvContent);
  }
}

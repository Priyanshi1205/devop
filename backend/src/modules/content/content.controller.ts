import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';
import { UpdateAssetRichDto } from './dto/update-asset-rich.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BillingService } from '../billing/billing.service';

@ApiTags('Content Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ContentController {
  constructor(
    private contentService: ContentService,
    private billingService: BillingService,
  ) {}

  @Get('projects/:projectId/content')
  @RequirePermissions('content:read')
  @ApiOperation({ summary: 'List all content drafts and assets in a project' })
  @ApiResponse({ status: 200, description: 'Content assets list returned' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    return this.contentService.findAll(projectId, user.organizationId);
  }

  @Get('content/:id')
  @RequirePermissions('content:read')
  @ApiOperation({ summary: 'Get a single content asset by ID' })
  @ApiResponse({ status: 200, description: 'Content asset details' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    return this.contentService.findOne(id, user.organizationId);
  }

  @Post('content')
  @RequirePermissions('content:create')
  @ApiOperation({ summary: 'Create a new content asset' })
  @ApiResponse({ status: 201, description: 'Content asset created' })
  async create(
    @Body() dto: CreateAssetDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    await this.billingService.verifyArticleLimit(user.userId, user.organizationId);
    return this.contentService.create(dto, user.organizationId);
  }

  @Patch('content/:id')
  @RequirePermissions('content:update')
  @ApiOperation({ summary: 'Update/Save draft for an existing content asset' })
  @ApiResponse({ status: 200, description: 'Content asset updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetRichDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    return this.contentService.updateRich(id, dto, user.organizationId);
  }

  @Delete('content/:id')
  @RequirePermissions('content:delete')
  @ApiOperation({ summary: 'Remove a content asset' })
  @ApiResponse({ status: 200, description: 'Content asset removed' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    return this.contentService.remove(id, user.organizationId);
  }

  @Post('projects/:projectId/content/generate')
  @RequirePermissions('content:create')
  @ApiOperation({ summary: 'Generate structured content draft using AI' })
  @ApiResponse({ status: 201, description: 'Content draft generated successfully' })
  async generate(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: GenerateArticleDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    await this.billingService.verifyArticleLimit(user.userId, user.organizationId);
    // Ensure the DTO matches the path projectId
    dto.projectId = projectId;
    return this.contentService.generate(dto, user.organizationId);
  }

  @Get('projects/:projectId/content/suggestions')
  @RequirePermissions('content:read')
  @ApiOperation({ summary: 'Get daily blog topic recommendations' })
  @ApiResponse({ status: 200, description: 'List of recommended blog topics' })
  async getSuggestions(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    return this.contentService.getDailySuggestions(projectId, user.organizationId);
  }

  @Post('content/:id/publish')
  @RequirePermissions('content:update')
  @ApiOperation({ summary: 'Publish content asset to connected CMS' })
  @ApiResponse({ status: 200, description: 'Post published successfully' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('connectionId', ParseUUIDPipe) connectionId: string,
    @Body('status') status: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    return this.contentService.publishToCms(id, connectionId, status, user.organizationId);
  }

  @Post('content/:id/regenerate-section')
  @RequirePermissions('content:update')
  @ApiOperation({ summary: 'Regenerate a specific section of the content asset using prompt instructions' })
  @ApiResponse({ status: 200, description: 'Section regenerated successfully' })
  async regenerateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('section') section: string,
    @Body('instruction') instruction: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'content');
    return this.contentService.regenerateSection(id, section, instruction, user.organizationId);
  }
}

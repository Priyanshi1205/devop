import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LlmService } from './llm.service';
import { OptimizeContentDto } from './dto/optimize-content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BillingService } from '../billing/billing.service';

@ApiTags('LLM Optimization & Visibility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class LlmController {
  constructor(
    private llmService: LlmService,
    private billingService: BillingService,
  ) {}

  @Post('llm/optimize')
  @RequirePermissions('content:write')
  @ApiOperation({ summary: 'Audit content assets and return LLM structural suggestions' })
  @ApiResponse({ status: 200, description: 'Content analyzed successfully' })
  async optimize(
    @Body() dto: OptimizeContentDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.llmService.optimize(dto, user.organizationId);
  }

  @Get('keywords/:keywordId/llm-visibility')
  @RequirePermissions('geo:read')
  @ApiOperation({ summary: 'List historical visibility indexes across search models' })
  @ApiResponse({ status: 200, description: 'Visibility results returned' })
  async getVisibility(
    @Param('keywordId', ParseUUIDPipe) keywordId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'llm_visibility');
    return this.llmService.getVisibility(keywordId, user.organizationId);
  }

  @Post('keywords/:keywordId/llm-visibility')
  @RequirePermissions('geo:write')
  @ApiOperation({ summary: 'Record dynamic visibility scores' })
  @ApiResponse({ status: 201, description: 'Visibility score recorded' })
  async recordVisibility(
    @Param('keywordId', ParseUUIDPipe) keywordId: string,
    @Body('engine') engine: string,
    @Body('percent') percent: number,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'llm_visibility');
    return this.llmService.recordVisibility(keywordId, engine, percent, user.organizationId);
  }

  @Post('keywords/:keywordId/llm-visibility/trigger')
  @RequirePermissions('geo:write')
  @ApiOperation({ summary: 'Trigger a live LLM visibility scan across engines' })
  @ApiResponse({ status: 200, description: 'Visibility scan completed' })
  async triggerVisibilityAudit(
    @Param('keywordId', ParseUUIDPipe) keywordId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.billingService.checkPlanAccess(user.userId, 'llm_visibility');
    return this.llmService.triggerVisibilityAudit(keywordId, user.organizationId);
  }
}

import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { TriggerAuditDto } from './dto/trigger-audit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('SEO Audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Post('audits')
  @RequirePermissions('audit:trigger')
  @ApiOperation({ summary: 'Trigger a new website technical crawl audit' })
  @ApiResponse({ status: 201, description: 'Audit triggered' })
  async trigger(
    @Body() triggerAuditDto: TriggerAuditDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.auditService.trigger(triggerAuditDto, user.organizationId);
  }

  @Get('websites/:websiteId/audits')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'List all crawls completed for a website' })
  @ApiResponse({ status: 200, description: 'Audits returned' })
  async findAll(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.auditService.findAll(websiteId, user.organizationId);
  }

  @Get('audits/:auditId/pages')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'List page details for a crawl audit' })
  @ApiResponse({ status: 200, description: 'Crawl pages returned' })
  async findPages(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.auditService.findPages(auditId, user.organizationId);
  }

  @Get('audits/:auditId/export')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Export technical crawl audit findings as PDF or CSV' })
  async export(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Query('format') format: 'pdf' | 'csv',
    @Res() res: any,
    @CurrentUser() user: UserPayload,
  ) {
    const report = await this.auditService.exportAudit(auditId, format, user.organizationId);
    res.setHeader('Content-Type', report.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.data);
  }
}

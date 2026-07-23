import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportingService } from './reporting.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('projects/:projectId/reports')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'List all reports compiled for a project' })
  @ApiResponse({ status: 200, description: 'Reports list' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportingService.findAll(projectId, user.organizationId);
  }

  @Get('reports/:id')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get a single report' })
  @ApiResponse({ status: 200, description: 'Report detail returned' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportingService.findOne(id, user.organizationId);
  }

  @Post('reports')
  @RequirePermissions('report:create')
  @ApiOperation({ summary: 'Compile a new campaign metrics report' })
  @ApiResponse({ status: 201, description: 'Report compiled' })
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportingService.create(dto, user.organizationId);
  }

  @Delete('reports/:id')
  @RequirePermissions('report:delete')
  @ApiOperation({ summary: 'Remove a report from storage' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportingService.remove(id, user.organizationId);
  }

  @Get('reports/:id/download')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Download a compiled report PDF' })
  async downloadReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
  ) {
    const stream = await this.reportingService.getReportFileStream(id, user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
    stream.pipe(res);
  }
}

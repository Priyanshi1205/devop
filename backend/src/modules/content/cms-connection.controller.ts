import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CmsConnectionService } from './cms-connection.service';
import { CreateCmsConnectionDto } from './dto/create-cms-connection.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('CMS Connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class CmsConnectionController {
  constructor(private readonly cmsConnectionService: CmsConnectionService) {}

  @Get('projects/:projectId/cms-connections')
  @RequirePermissions('content:read')
  @ApiOperation({ summary: 'List all CMS connections in a project' })
  @ApiResponse({ status: 200, description: 'CMS connections list returned' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.cmsConnectionService.findAll(projectId, user.organizationId);
  }

  @Post('projects/:projectId/cms-connections')
  @RequirePermissions('content:create')
  @ApiOperation({ summary: 'Link a new CMS connection' })
  @ApiResponse({ status: 201, description: 'CMS connection created' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateCmsConnectionDto,
    @CurrentUser() user: UserPayload,
  ) {
    dto.projectId = projectId;
    return this.cmsConnectionService.create(dto, user.organizationId);
  }

  @Delete('cms-connections/:id')
  @RequirePermissions('content:delete')
  @ApiOperation({ summary: 'Remove a CMS connection' })
  @ApiResponse({ status: 200, description: 'CMS connection removed' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.cmsConnectionService.remove(id, user.organizationId);
  }
}

import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BacklinkService } from './backlink.service';
import { CreateBacklinkDto } from './dto/create-backlink.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Backlinks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class BacklinkController {
  constructor(private backlinkService: BacklinkService) {}

  @Get('websites/:websiteId/backlinks')
  @RequirePermissions('website:read')
  @ApiOperation({ summary: 'List all backlinks discovered for a website' })
  @ApiResponse({ status: 200, description: 'Backlinks retrieved successfully' })
  async findAll(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.backlinkService.findAll(websiteId, user.organizationId);
  }

  @Post('websites/:websiteId/backlinks')
  @RequirePermissions('website:write')
  @ApiOperation({ summary: 'Manually link/upload a discovered backlink' })
  @ApiResponse({ status: 201, description: 'Backlink tracked successfully' })
  async create(
    @Param('websiteId', ParseUUIDPipe) websiteId: string,
    @Body() dto: CreateBacklinkDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.backlinkService.create(websiteId, dto, user.organizationId);
  }

  @Delete('backlinks/:id')
  @RequirePermissions('website:write')
  @ApiOperation({ summary: 'Delete or disavow a tracked backlink' })
  @ApiResponse({ status: 200, description: 'Backlink deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.backlinkService.remove(id, user.organizationId);
  }
}

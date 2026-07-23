import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { UpdateOrgDto } from './dto/update-org.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Get()
  @RequirePermissions('org:read')
  @ApiOperation({ summary: 'Get current organization details' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  async findOne(@CurrentUser() user: UserPayload) {
    return this.orgService.findOne(user.organizationId);
  }

  @Patch()
  @RequirePermissions('org:write')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  async update(
    @Body() updateOrgDto: UpdateOrgDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.orgService.update(user.organizationId, updateOrgDto);
  }
}

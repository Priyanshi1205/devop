import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Post()
  @RequirePermissions('project:create')
  @ApiOperation({ summary: 'Create a new campaign project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.projectService.create(createProjectDto, user.organizationId);
  }

  @Get()
  @RequirePermissions('project:read')
  @ApiOperation({ summary: 'List all campaign projects' })
  @ApiResponse({ status: 200, description: 'List of projects retrieved' })
  async findAll(@CurrentUser() user: UserPayload) {
    return this.projectService.findAll(user.organizationId);
  }
}

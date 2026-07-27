import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateSubscriberDto, ChangePlanDto, ExtendSubscriptionDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overview dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('subscribers')
  @ApiOperation({ summary: 'Get paginated subscriber list' })
  @ApiResponse({ status: 200, description: 'Subscriber list retrieved successfully' })
  async getSubscribers(
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getSubscribers(search, plan, status, pageNum, limitNum);
  }

  @Get('subscribers/:id')
  @ApiOperation({ summary: 'Get subscriber details' })
  @ApiResponse({ status: 200, description: 'Subscriber details retrieved successfully' })
  async getSubscriberDetail(@Param('id') id: string) {
    return this.adminService.getSubscriberDetail(id);
  }

  @Patch('subscribers/:id/plan')
  @ApiOperation({ summary: 'Change subscriber plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async changePlan(
    @Param('id') id: string,
    @Body() changePlanDto: ChangePlanDto,
  ) {
    return this.adminService.changePlan(id, changePlanDto);
  }

  @Patch('subscribers/:id/extend')
  @ApiOperation({ summary: 'Extend subscriber endDate duration' })
  @ApiResponse({ status: 200, description: 'Subscription extended successfully' })
  async extendSubscription(
    @Param('id') id: string,
    @Body() extendSubscriptionDto: ExtendSubscriptionDto,
  ) {
    return this.adminService.extendSubscription(id, extendSubscriptionDto);
  }

  @Patch('subscribers/:id/cancel')
  @ApiOperation({ summary: 'Cancel/suspend subscriber account subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(@Param('id') id: string) {
    return this.adminService.cancelSubscription(id);
  }

  @Delete('subscribers/:id')
  @ApiOperation({ summary: 'Remove subscriber user account' })
  @ApiResponse({ status: 200, description: 'Subscriber account deleted' })
  async deleteSubscriber(@Param('id') id: string) {
    return this.adminService.deleteSubscriber(id);
  }

  @Post('subscribers')
  @ApiOperation({ summary: 'Add a new subscriber manually' })
  @ApiResponse({ status: 201, description: 'Subscriber successfully created manually' })
  async createSubscriber(@Body() createSubscriberDto: CreateSubscriberDto) {
    return this.adminService.createSubscriber(createSubscriberDto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List all payments/transactions history' })
  @ApiResponse({ status: 200, description: 'Payments list retrieved' })
  async getPayments(@Query('status') status?: string) {
    return this.adminService.getPayments(status);
  }

  @Patch('payments/:id/mark-paid')
  @ApiOperation({ summary: 'Mark an outstanding payment as completed' })
  @ApiResponse({ status: 200, description: 'Payment marked as paid' })
  async markPaymentPaid(@Param('id') id: string) {
    return this.adminService.markPaymentPaid(id);
  }
}

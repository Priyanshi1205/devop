import { Controller, Get, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import type { Request } from 'express';

@ApiTags('Billing & Subscriptions')
@Controller()
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('billing/checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Create a Stripe Checkout Session' })
  @ApiResponse({ status: 201, description: 'Checkout URL generated' })
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.billingService.createCheckoutSession(dto, user.userId);
  }

  @Get('billing/subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'Get current subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription details returned' })
  async getSubscription(@CurrentUser() user: UserPayload) {
    return this.billingService.getSubscription(user.userId);
  }

  @Get('billing/invoices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'List all organization invoices' })
  @ApiResponse({ status: 200, description: 'Invoices list returned' })
  async getInvoices(@CurrentUser() user: UserPayload) {
    return this.billingService.getInvoices(user.organizationId);
  }

  @Post('billing/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Incoming Lemon Squeezy Webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(@Req() request: Request) {
    return this.billingService.handleLemonSqueezyWebhook(request.body);
  }
}

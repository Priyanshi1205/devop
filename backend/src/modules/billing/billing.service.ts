import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async checkPlanAccess(userId: string, feature: string) {
    if (!userId || typeof userId !== 'string' || userId.length < 30) {
      return;
    }
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
    } catch (err: any) {
      console.warn('[BillingService] Skipped user plan lookup due to invalid ID format:', err.message);
      return;
    }

    if (!user) {
      return;
    }

    // Check if trial has expired
    const isTrialExpired = user.plan === 'free_trial' && user.trialEndDate && user.trialEndDate.getTime() < Date.now();
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled' || isTrialExpired) {
      throw new ForbiddenException('Your trial/subscription has expired. Please upgrade to continue.');
    }

    const plan = user.plan;

    if (feature === 'gtm') {
      if (plan === 'free_trial') {
        throw new ForbiddenException('GTM integration is locked on Free Trial. Please upgrade to Starter or higher.');
      }
    }

    if (feature === 'local_seo' || feature === 'llm_visibility' || feature === 'geo' || feature === 'competitor') {
      if (plan === 'free_trial' || plan === 'starter') {
        throw new ForbiddenException(`Upgrade to Pro or Agency to unlock ${feature.replace('_', ' ').toUpperCase()}.`);
      }
    }

    if (feature === 'content') {
      if (plan === 'free_trial') {
        throw new ForbiddenException('Content Studio is locked on Free Trial. Please upgrade to Starter or higher.');
      }
    }

    return {
      plan: user.plan,
      status: user.subscriptionStatus,
      trialEndDate: user.trialEndDate,
      paid: user.plan !== 'free_trial'
    };
  }

  async verifyWebsiteLimit(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ForbiddenException('No active user account found.');
    }

    const isTrialExpired = user.plan === 'free_trial' && user.trialEndDate && user.trialEndDate.getTime() < Date.now();
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled' || isTrialExpired) {
      throw new ForbiddenException('Your trial/subscription has expired. Please upgrade.');
    }

    const currentWebsitesCount = await this.prisma.website.count({
      where: { project: { organizationId: orgId } }
    });

    const limits: Record<string, number> = {
      free_trial: 1,
      starter: 2,
      pro: 3,
      agency: 10
    };

    const limit = limits[user.plan] || 1;
    if (currentWebsitesCount >= limit) {
      const planDisplayNames: Record<string, string> = {
        free_trial: 'Free Trial',
        starter: 'Starter',
        pro: 'Pro',
        agency: 'Agency'
      };
      const displayName = planDisplayNames[user.plan] || user.plan;
      throw new ForbiddenException(`You have reached your domain limit for ${displayName} plan. Upgrade to add more domains.`);
    }
  }

  async verifyArticleLimit(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ForbiddenException('No active user account found.');
    }

    const isTrialExpired = user.plan === 'free_trial' && user.trialEndDate && user.trialEndDate.getTime() < Date.now();
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled' || isTrialExpired) {
      throw new ForbiddenException('Your trial/subscription has expired. Please upgrade.');
    }

    if (user.plan === 'free_trial') {
      throw new ForbiddenException('Content Studio is locked on Free Trial. Please upgrade to Starter or higher.');
    }

    if (user.plan === 'agency') {
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const projects = await this.prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    const articlesCount = await this.prisma.contentAsset.count({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: startOfMonth }
      }
    });

    const limits: Record<string, number> = {
      starter: 5,
      pro: 20
    };

    const limit = limits[user.plan] || 0;
    if (articlesCount >= limit) {
      throw new ForbiddenException(`Monthly article creation limit reached (${limit} max) for ${user.plan.toUpperCase()} plan. Please upgrade for more.`);
    }
  }

  async verifyKeywordLimit(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ForbiddenException('No active user account found.');
    }

    const isTrialExpired = user.plan === 'free_trial' && user.trialEndDate && user.trialEndDate.getTime() < Date.now();
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled' || isTrialExpired) {
      throw new ForbiddenException('Your trial/subscription has expired. Please upgrade.');
    }

    if (user.plan === 'free_trial') {
      throw new ForbiddenException('Keyword Research is locked on Free Trial. Please upgrade to Starter or higher.');
    }

    if (user.plan === 'agency') {
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const keywordCount = await this.prisma.keyword.count({
      where: {
        website: { project: { organizationId: orgId } },
        createdAt: { gte: startOfMonth }
      }
    });

    const limits: Record<string, number> = {
      starter: 100,
      pro: 500
    };

    const limit = limits[user.plan] || 0;
    if (keywordCount >= limit) {
      throw new ForbiddenException(`Monthly keyword tracking limit reached (${limit} max) for ${user.plan.toUpperCase()} plan. Please upgrade to track more.`);
    }
  }

  async createCheckoutSession(dto: any, userId: string) {
    const planName = dto.plan || 'starter';
    const checkoutUrl = `/billing/pay?plan=${planName}&userId=${userId}`;
    return {
      checkoutUrl,
    };
  }

  async getSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('No active user account found');
    }

    return {
      plan: user.plan,
      status: user.subscriptionStatus,
      trialEndDate: user.trialEndDate,
      paid: user.plan !== 'free_trial'
    };
  }

  async getInvoices(orgId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleLemonSqueezyWebhook(payload: any) {
    const eventName = payload.meta?.event_name;
    const data = payload.data;
    if (!data) return { received: true };

    const attributes = data.attributes;
    const userId = attributes?.custom_data?.user_id;
    const subscriptionId = data.id;

    if (!userId) {
      console.log('Lemon Squeezy Webhook: No user_id found in custom_data', payload);
      return { error: 'No user_id found' };
    }

    const variantName = attributes?.variant_name || 'Starter';
    let plan = 'starter';
    if (variantName.toLowerCase().includes('pro')) {
      plan = 'pro';
    } else if (variantName.toLowerCase().includes('agency')) {
      plan = 'agency';
    } else if (variantName.toLowerCase().includes('starter')) {
      plan = 'starter';
    }

    const status = attributes?.status === 'active' ? 'active' : 'cancelled';
    const renewsAt = attributes?.renews_at ? new Date(attributes.renews_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      // Lemon Squeezy Webhook Integration endpoint: Updates subscription fields directly on the User model
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          plan,
          subscriptionStatus: status,
          trialStartDate: new Date(),
          trialEndDate: renewsAt,
        },
      });
      console.log(`Successfully updated subscription for user ${userId} to ${plan} plan via Lemon Squeezy`);
    }

    return { received: true };
  }
}

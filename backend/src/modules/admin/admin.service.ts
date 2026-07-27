import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSubscriberDto, ChangePlanDto, ExtendSubscriptionDto } from './dto/admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpirationCron() {
    this.logger.log('Running daily subscription expiration and overdue payment audits...');
    const now = new Date();

    // 1. Find and expire subscriptions past their endDate
    const expiredCount = await this.prisma.subscription.updateMany({
      where: {
        status: { in: ['active', 'trial'] },
        endDate: { lt: now }
      },
      data: {
        status: 'expired',
        paymentStatus: 'due'
      }
    });

    if (expiredCount.count > 0) {
      this.logger.log(`Expired ${expiredCount.count} subscriptions.`);
    }

    // 2. Synchronize status back to the User model (backwards compatibility)
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'expired' },
      select: { userId: true }
    });

    for (const sub of expiredSubscriptions) {
      await this.prisma.user.update({
        where: { id: sub.userId },
        data: { subscriptionStatus: 'expired' }
      });
    }

    // 3. Mark due payments past their dueDate as 'overdue'
    const overdueCount = await this.prisma.payment.updateMany({
      where: {
        status: 'due',
        dueDate: { lt: now }
      },
      data: {
        status: 'overdue'
      }
    });

    if (overdueCount.count > 0) {
      this.logger.log(`Marked ${overdueCount.count} payments as overdue.`);
    }
  }

  // Stats
  async getStats() {
    const now = new Date();
    const activeSubscribers = await this.prisma.subscription.count({
      where: { status: { in: ['active', 'trial'] } }
    });

    const expiredSubscribers = await this.prisma.subscription.count({
      where: { status: { in: ['expired', 'cancelled'] } }
    });

    // Upcoming renewals in next 7 days
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = await this.prisma.subscription.count({
      where: {
        status: { in: ['active', 'trial'] },
        endDate: { gte: now, lte: next7Days }
      }
    });

    // Monthly payments total this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paymentsThisMonth = await this.prisma.payment.findMany({
      where: {
        status: 'paid',
        paidOn: { gte: startOfMonth, lte: now }
      }
    });
    const totalRevenueThisMonth = paymentsThisMonth.reduce((acc, curr) => acc + curr.amount, 0);

    // MRR calculation
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: { in: ['active', 'trial'] } },
      include: { plan: true }
    });
    const mrr = activeSubscriptions.reduce((acc, curr) => {
      const cycle = curr.plan.billingCycle;
      if (cycle === 'yearly') {
        return acc + (curr.amount / 12);
      }
      return acc + curr.amount;
    }, 0);

    // Simple charts trend (last 6 months)
    const revenueTrend = [];
    const subscriberGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleString('default', { month: 'short' });

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      // Revenue
      const monthPayments = await this.prisma.payment.findMany({
        where: {
          status: 'paid',
          paidOn: { gte: monthStart, lte: monthEnd }
        }
      });
      const revenue = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);
      revenueTrend.push({ label, value: revenue });

      // Growth
      const newSubs = await this.prisma.subscription.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      });
      subscriberGrowth.push({ label, value: newSubs });
    }

    return {
      activeSubscribers,
      totalRevenueThisMonth,
      mrr,
      upcomingRenewals,
      expiredSubscribers,
      revenueTrend,
      subscriberGrowth
    };
  }

  // Fetch paginated subscribers list
  async getSubscribers(search = '', plan = '', status = '', page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const subWhere: any = {};
    if (status) {
      subWhere.status = status;
    }
    if (plan) {
      subWhere.plan = { name: { equals: plan, mode: 'insensitive' } };
    }

    if (Object.keys(subWhere).length > 0) {
      where.subscription = subWhere;
    }

    const total = await this.prisma.user.count({ where });
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      data: users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        plan: u.subscription?.plan?.name || u.plan || 'Free Trial',
        status: u.subscription?.status || u.subscriptionStatus || 'trial',
        startDate: u.subscription?.startDate || u.createdAt,
        endDate: u.subscription?.endDate || u.trialEndDate,
        nextDue: u.subscription?.nextBillingDate,
        amount: u.subscription?.amount || 0.0,
        paymentStatus: u.subscription?.paymentStatus || 'paid'
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get single subscriber detail
  async getSubscriberDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            plan: true,
            payments: {
              orderBy: { dueDate: 'desc' }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Subscriber not found.');
    }

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        plan: user.subscription?.plan?.name || user.plan,
        status: user.subscription?.status || user.subscriptionStatus,
        startDate: user.subscription?.startDate || user.createdAt,
        endDate: user.subscription?.endDate || user.trialEndDate,
        nextDue: user.subscription?.nextBillingDate,
        amount: user.subscription?.amount || 0.0,
        paymentStatus: user.subscription?.paymentStatus || 'paid'
      },
      payments: user.subscription?.payments || []
    };
  }

  // Change Plan
  async changePlan(userId: string, changePlanDto: ChangePlanDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user) {
      throw new NotFoundException('Subscriber not found.');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { name: changePlanDto.planName }
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${changePlanDto.planName} not found.`);
    }

    // Update or create subscription
    let subscription = user.subscription;
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: 'active',
          startDate: now,
          endDate: nextMonth,
          nextBillingDate: nextMonth,
          amount: plan.price,
          currency: 'INR',
          paymentStatus: 'paid'
        }
      });
    } else {
      subscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: plan.id,
          amount: plan.price,
          status: 'active',
          endDate: nextMonth,
          nextBillingDate: nextMonth,
          paymentStatus: 'paid'
        }
      });
    }

    // Synchronize to User model
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: plan.name.toLowerCase().replace(' ', '_'),
        subscriptionStatus: 'active',
        trialEndDate: nextMonth
      }
    });

    // Create a Payment transaction
    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: plan.price,
        paidOn: now,
        dueDate: now,
        status: 'paid',
        paymentMethod: 'manual'
      }
    });

    return { message: `Plan successfully updated to ${plan.name}` };
  }

  // Extend Subscription
  async extendSubscription(userId: string, extendSubscriptionDto: ExtendSubscriptionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user) {
      throw new NotFoundException('Subscriber not found.');
    }

    if (!user.subscription) {
      throw new ForbiddenException('User has no active subscription ledger. Upgrade plan first.');
    }

    const currentEndDate = new Date(user.subscription.endDate);
    if (extendSubscriptionDto.months) {
      currentEndDate.setMonth(currentEndDate.getMonth() + extendSubscriptionDto.months);
    }
    if (extendSubscriptionDto.days) {
      currentEndDate.setDate(currentEndDate.getDate() + extendSubscriptionDto.days);
    }

    await this.prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        endDate: currentEndDate,
        nextBillingDate: currentEndDate,
        status: 'active'
      }
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'active',
        trialEndDate: currentEndDate
      }
    });

    return { message: `Subscription extended successfully until ${currentEndDate.toLocaleDateString()}` };
  }

  // Cancel/Suspend subscription
  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user) {
      throw new NotFoundException('Subscriber not found.');
    }

    if (user.subscription) {
      await this.prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          status: 'cancelled',
          paymentStatus: 'due'
        }
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'cancelled'
      }
    });

    return { message: 'Subscription successfully cancelled/suspended.' };
  }

  // Delete user account
  async deleteSubscriber(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Subscriber not found.');
    }

    await this.prisma.user.delete({
      where: { id: userId }
    });

    return { message: 'Subscriber account deleted successfully.' };
  }

  // Add new subscriber manually
  async createSubscriber(createSubscriberDto: CreateSubscriberDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: createSubscriberDto.email }
    });

    if (existing) {
      throw new ForbiddenException('Subscriber email already exists.');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { name: createSubscriberDto.planName }
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${createSubscriberDto.planName} not found.`);
    }

    const org = await this.prisma.organization.create({
      data: {
        name: `${createSubscriberDto.firstName}'s Workspace`
      }
    });

    const dbRole = await this.prisma.role.findUnique({
      where: { name: 'OWNER' }
    });

    if (!dbRole) {
      throw new NotFoundException('OWNER role not defined.');
    }

    const passwordHash = await bcrypt.hash(createSubscriberDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: createSubscriberDto.email,
        passwordHash,
        firstName: createSubscriberDto.firstName,
        lastName: createSubscriberDto.lastName,
        organizationId: org.id,
        roleId: dbRole.id,
        isEmailVerified: true,
        plan: plan.name.toLowerCase().replace(' ', '_'),
        subscriptionStatus: 'active',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Create default project
    await this.prisma.project.create({
      data: {
        name: 'Default Project',
        organizationId: org.id
      }
    });

    const now = new Date();
    const nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startDate: now,
        endDate: nextBilling,
        nextBillingDate: nextBilling,
        amount: plan.price,
        currency: 'INR',
        paymentStatus: 'paid'
      }
    });

    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: plan.price,
        paidOn: now,
        dueDate: now,
        status: 'paid',
        paymentMethod: 'manual'
      }
    });

    return { message: 'Subscriber successfully created manually.', userId: user.id };
  }

  // Get payments
  async getPayments(status = '') {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        subscription: {
          include: {
            user: true,
            plan: true
          }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    return payments.map(p => ({
      id: p.id,
      clientName: `${p.subscription.user.firstName} ${p.subscription.user.lastName}`,
      email: p.subscription.user.email,
      plan: p.subscription.plan.name,
      amount: p.amount,
      dueDate: p.dueDate,
      paidOn: p.paidOn,
      status: p.status,
      paymentMethod: p.paymentMethod,
      invoiceUrl: p.invoiceUrl
    }));
  }

  // Mark Payment as Paid
  async markPaymentPaid(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true }
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found.');
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'paid',
        paidOn: new Date()
      }
    });

    await this.prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        paymentStatus: 'paid',
        status: 'active'
      }
    });

    // Synchronize to User model
    await this.prisma.user.update({
      where: { id: payment.subscription.userId },
      data: {
        subscriptionStatus: 'active'
      }
    });

    return { message: 'Payment marked as paid successfully.' };
  }
}

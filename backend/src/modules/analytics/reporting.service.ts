import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PeriodReport {
  trafficGrowthPercent: number;
  conversionGrowthPercent: number;
  revenueGrowthPercent: number;
  currentTraffic: number;
  previousTraffic: number;
  currentConversions: number;
  previousConversions: number;
  currentRevenue: number;
  previousRevenue: number;
  topLandingPages: { path: string; views: number }[];
  topChannels: { channel: string; sessions: number }[];
}

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async generateGa4PeriodReport(propertyId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<PeriodReport> {
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;

    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - days);
    
    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - days * 2);

    // Fetch metric aggregations for current period
    const currentMetrics = await this.prisma.ga4Metric.findMany({
      where: {
        propertyId,
        date: { gte: currentStart }
      }
    });

    // Fetch metric aggregations for previous period
    const previousMetrics = await this.prisma.ga4Metric.findMany({
      where: {
        propertyId,
        date: {
          gte: previousStart,
          lt: currentStart
        }
      }
    });

    const sumMetrics = (arr: any[]) => {
      let sessions = 0;
      let conversions = 0;
      let revenue = 0;
      arr.forEach(m => {
        sessions += m.sessions || 0;
        conversions += m.conversions || 0;
        revenue += m.revenue || 0.0;
      });
      return { sessions, conversions, revenue };
    };

    const currentSum = sumMetrics(currentMetrics);
    const previousSum = sumMetrics(previousMetrics);

    const getGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    // Calculate growth percentages
    const trafficGrowthPercent = getGrowth(currentSum.sessions, previousSum.sessions);
    const conversionGrowthPercent = getGrowth(currentSum.conversions, previousSum.conversions);
    const revenueGrowthPercent = getGrowth(currentSum.revenue, previousSum.revenue);

    // Calculate top performing landing pages from Ga4Data (or generate default list)
    // In our seed, pagePath lists views/activeUsers
    const topLandingPagesRaw = await this.prisma.ga4Data.findMany({
      where: {
        website: { ga4Properties: { some: { id: propertyId } } }
      },
      orderBy: { activeUsers: 'desc' },
      take: 4
    });

    const topLandingPages = topLandingPagesRaw.map(p => ({
      path: p.pagePath,
      views: p.activeUsers * 2 // Estimate views as 2 * activeUsers
    }));

    // Accumulate channels breakdown from current metrics
    const channelAgg: { [key: string]: number } = {};
    currentMetrics.forEach(m => {
      const sources = typeof m.trafficSources === 'object' ? (m.trafficSources as any) : {};
      if (sources) {
        Object.keys(sources).forEach(k => {
          channelAgg[k] = (channelAgg[k] || 0) + Number(sources[k]);
        });
      }
    });

    const topChannels = Object.keys(channelAgg).map(k => ({
      channel: k.charAt(0).toUpperCase() + k.slice(1),
      sessions: channelAgg[k]
    })).sort((a, b) => b.sessions - a.sessions);

    return {
      trafficGrowthPercent,
      conversionGrowthPercent,
      revenueGrowthPercent,
      currentTraffic: currentSum.sessions,
      previousTraffic: previousSum.sessions,
      currentConversions: currentSum.conversions,
      previousConversions: previousSum.conversions,
      currentRevenue: currentSum.revenue,
      previousRevenue: previousSum.revenue,
      topLandingPages,
      topChannels
    };
  }
}

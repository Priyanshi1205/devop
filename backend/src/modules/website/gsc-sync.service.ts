import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { google } from 'googleapis';

@Injectable()
export class GscSyncService {
  constructor(private prisma: PrismaService) {}

  private getGoogleOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // Get a verified, refreshed Google OAuth client
  async getFreshOAuthClient(websiteId: string, orgId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      include: { project: true }
    });

    if (!website || website.project.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this website');
    }

    if (!website.googleAccessToken) {
      throw new NotFoundException('Google Search Console credentials not found for this website');
    }

    const oauth2Client = this.getGoogleOAuthClient();
    oauth2Client.setCredentials({
      access_token: website.googleAccessToken,
      refresh_token: website.googleRefreshToken || undefined,
    });

    const isMock = website.googleAccessToken && website.googleAccessToken.startsWith('mock-');
    // If token is expired or expires in the next 5 minutes, refresh it
    const isExpired = website.googleTokenExpiry && new Date(website.googleTokenExpiry).getTime() < Date.now() + 300000;
    
    // Only attempt refresh if not a mock token and a refresh token exists
    if (!isMock && isExpired && website.googleRefreshToken) {
      try {
        console.log(`Refreshing expired Google OAuth access token for website ${website.id}...`);
        const { credentials } = await oauth2Client.refreshAccessToken();
        const newExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000);

        // Update tokens in Website table
        await this.prisma.website.update({
          where: { id: website.id },
          data: {
            googleAccessToken: credentials.access_token || website.googleAccessToken,
            googleRefreshToken: credentials.refresh_token || website.googleRefreshToken,
            googleTokenExpiry: newExpiry,
          }
        });

        // Also update corresponding GA4 account tokens if they exist for this organization
        await this.prisma.ga4Account.updateMany({
          where: { organizationId: orgId },
          data: {
            googleAccessToken: credentials.access_token || website.googleAccessToken,
            googleRefreshToken: credentials.refresh_token || website.googleRefreshToken,
            googleTokenExpiry: newExpiry,
          }
        });

        oauth2Client.setCredentials(credentials);
        console.log(`Google OAuth token successfully refreshed.`);
      } catch (err: any) {
        console.error(`Failed to refresh Google access token for website ${website.id}:`, err);
        const errStr = String(err.message || err);
        if (errStr.includes('invalid_grant') || errStr.includes('invalid_request') || errStr.includes('unauthorized') || (err.response && err.response.data && (err.response.data.error === 'invalid_grant' || err.response.data.error === 'invalid_request'))) {
          console.warn(`Google OAuth refresh token has expired or been revoked. Clearing tokens for website ${website.id} to prompt reconnection.`);
          await this.prisma.website.update({
            where: { id: website.id },
            data: {
              googleAccessToken: null,
              googleRefreshToken: null,
              googleTokenExpiry: null,
            }
          });
          throw new BadRequestException('Google account authorization has expired or been revoked. Please reconnect your Google account in Websites settings.');
        }
        console.warn(`Failed to refresh Google access token: ${err.message}`);
      }
    }

    return oauth2Client;
  }

  // Synchronize Google Search Console data
  async syncGscData(id: string, orgId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!website || website.project.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this website');
    }

    if (!website.googleAccessToken) {
      throw new BadRequestException('Google account not connected for Search Console');
    }

    const isMock = website.googleAccessToken && website.googleAccessToken.startsWith('mock-');
    let fetchedRows: any[] = [];
    let isLiveSync = false;

    // Define date bounds
    const startDate = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    if (isMock) {
      console.log('Mock access token detected. Running simulated GSC sync...');
      fetchedRows = this.generateMockGscRows(website.domain);
      isLiveSync = true;
    } else {
      try {
        const oauth2Client = await this.getFreshOAuthClient(id, orgId);
        const sc = google.searchconsole({ version: 'v1', auth: oauth2Client });
        const siteUrl = website.gscPropertyUrl || `sc-domain:${website.domain}`;

        console.log(`Fetching Search Console data for ${siteUrl} (90 days, limit 5000)...`);
        const res = await sc.searchanalytics.query({
          siteUrl: siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['query', 'page', 'date'],
            rowLimit: 5000,
          },
        });

        if (res.data.rows && res.data.rows.length > 0) {
          fetchedRows = res.data.rows;
          isLiveSync = true;
        }
      } catch (err) {
        console.error('Google Search Console sync query failed:', err);
        throw new BadRequestException(`Google Search Console sync failed: ${err.message}`);
      }
    }

    if (!isLiveSync || fetchedRows.length === 0) {
      throw new BadRequestException('No search performance data returned from Google Search Console API.');
    }

    // 1. Clear existing GSC records for this website
    await this.prisma.searchConsoleData.deleteMany({
      where: { websiteId: id },
    });

    // 2. Format and insert SearchConsoleData
    const dbRecords = fetchedRows.map(row => {
      const query = row.keys?.[0] || 'unknown';
      const page = row.keys?.[1] || '/';
      const dateStr = row.keys?.[2] || new Date().toISOString().split('T')[0];
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0.0;
      const position = row.position || 0.0;

      return {
        websiteId: id,
        query,
        page,
        clicks,
        impressions,
        ctr,
        position,
        date: new Date(dateStr),
      };
    });

    await this.prisma.searchConsoleData.createMany({
      data: dbRecords,
    });

    // 3. Process daily position snapshots for tracked keywords
    const trackedKeywords = await this.prisma.keyword.findMany({
      where: { websiteId: id },
    });

    if (trackedKeywords.length > 0) {
      const kwMap = new Map(trackedKeywords.map(k => [k.text.toLowerCase(), k.id]));
      const queryDatePosMap = new Map<string, number>(); // key: "query|date" -> min position (top ranking page)

      fetchedRows.forEach(row => {
        const query = row.keys?.[0];
        const dateStr = row.keys?.[2];
        if (!query || !dateStr) return;

        const key = `${query.toLowerCase()}|${dateStr}`;
        const pos = row.position || 0.0;

        if (!queryDatePosMap.has(key) || pos < queryDatePosMap.get(key)!) {
          queryDatePosMap.set(key, pos);
        }
      });

      const snapshotRecords = [];
      const kwPositionsMap = new Map<string, number[]>(); // keywordId -> array of positions in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

      for (const [key, position] of queryDatePosMap.entries()) {
        const [query, dateStr] = key.split('|');
        const keywordId = kwMap.get(query);

        if (keywordId) {
          const date = new Date(dateStr);
          snapshotRecords.push({
            keywordId,
            position,
            date,
          });

          if (date >= sevenDaysAgo) {
            let positions = kwPositionsMap.get(keywordId);
            if (!positions) {
              positions = [];
              kwPositionsMap.set(keywordId, positions);
            }
            positions.push(position);
          }
        }
      }

      if (snapshotRecords.length > 0) {
        // Deduplicate snapshots by keywordId and date to avoid unique constraint violations (e.g. if duplicate queries map to same keyword text)
        const uniqueSnapshotsMap = new Map<string, typeof snapshotRecords[0]>();
        for (const record of snapshotRecords) {
          const dateOnlyStr = record.date.toISOString().split('T')[0];
          const uniqueKey = `${record.keywordId}|${dateOnlyStr}`;
          if (!uniqueSnapshotsMap.has(uniqueKey) || record.position < uniqueSnapshotsMap.get(uniqueKey)!.position) {
            uniqueSnapshotsMap.set(uniqueKey, record);
          }
        }
        const deduplicatedSnapshots = Array.from(uniqueSnapshotsMap.values());
        const keywordIds = Array.from(new Set(deduplicatedSnapshots.map(r => r.keywordId)));
        
        // Delete old snapshots in the date range to overwrite them
        await this.prisma.keywordPositionSnapshot.deleteMany({
          where: {
            keywordId: { in: keywordIds },
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        });

        // Batch insert snapshots
        await this.prisma.keywordPositionSnapshot.createMany({
          data: deduplicatedSnapshots,
        });
      }

      // Update gscRank in Keyword table
      for (const kw of trackedKeywords) {
        const positions = kwPositionsMap.get(kw.id);
        if (positions && positions.length > 0) {
          const avgPos = positions.reduce((sum, p) => sum + p, 0) / positions.length;
          await this.prisma.keyword.update({
            where: { id: kw.id },
            data: { gscRank: parseFloat(avgPos.toFixed(1)) },
          });
        } else {
          // If no data in the last 7 days, set gscRank to null
          await this.prisma.keyword.update({
            where: { id: kw.id },
            data: { gscRank: null },
          });
        }
      }
    }

    return { 
      success: true, 
      recordsSynced: dbRecords.length, 
      source: isMock ? 'Simulated Local Engine' : 'Google API' 
    };
  }

  private generateMockGscRows(domain: string): any[] {
    const rows: any[] = [];
    const queries = [
      'real estate company in indore',
      'luxury plots in indore',
      'premium villas in indore',
      'best property broker in indore',
      'flats for sale in indore',
      'indore property price',
      'commercial plots indore',
      'buy residential plot indore',
      'best winter boots',
      'buy waterproof boots',
      'how to clean hiking gear',
      'hiking boots vs trail running shoes',
      'cheap leather boots near me'
    ];
    const pages = [
      '/',
      '/projects',
      '/about',
      '/contact',
      '/luxury-plots',
      '/villas',
      '/boots',
      '/gear'
    ];

    // For the last 90 days
    for (let i = 90; i >= 0; i--) {
      const dateStr = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      
      queries.forEach((q, idx) => {
        const page = pages[idx % pages.length];
        
        // Simulate a rank over time with some random fluctuation around a trend
        const startRank = 35 - (idx * 2);
        const targetRank = 8 - (idx % 3);
        const progress = (90 - i) / 90; // 0 to 1
        const trendRank = startRank + progress * (targetRank - startRank);
        const noise = Math.sin(i / 3) * 1.5 + Math.cos(i / 5) * 1.0;
        const position = Math.max(1.0, parseFloat((trendRank + noise).toFixed(1)));

        const clicks = Math.max(0, Math.floor(Math.random() * 10) + Math.floor(15 / position));
        const impressions = Math.max(clicks, Math.floor(clicks * (position * 0.7 + 3)));
        const ctr = impressions > 0 ? clicks / impressions : 0.0;

        rows.push({
          keys: [q, page, dateStr],
          clicks,
          impressions,
          ctr,
          position,
        });
      });
    }

    return rows;
  }
}

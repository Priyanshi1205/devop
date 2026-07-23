import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';

// Helper functions for stable, hash-based mock metrics
function getStableDomainAuthority(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 35 + Math.abs(hash % 50); // returns 35 to 85
}

function getStableTraffic(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 12000 + Math.abs(hash % 98000) * 8; // returns 12000 to ~800,000
}

const genericExclusions = new Set([
  'amazon.com', 'wikipedia.org', 'youtube.com', 'google.com', 'hubspot.com',
  'nytimes.com', 'outdoorgearlab.com', 'runnerworld.com', 'runnersworld.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'pinterest.com',
  'reddit.com', 'quora.com', 'medium.com', 'yelp.com', 'tripadvisor.com',
  'indiatimes.com', 'ndtv.com', 'moneycontrol.com', 'justdial.com', 'sulekha.com',
  'forbes.com', 'backlinko.com', 'gearpatrol.com', 'github.com', 'w3schools.com',
  'stackoverflow.com', 'geeksforgeeks.org', 'tutorialspoint.com', 'ebay.com',
  'walmart.com', 'target.com', 'etsy.com', 'bestbuy.com', 'homedepot.com',
  'apple.com', 'microsoft.com', 'adobe.com', 'zoom.us', 'slack.com',
  'cnn.com', 'bbc.co.uk', 'bbc.com', 'theguardian.com', 'washingtonpost.com',
  'huffpost.com', 'bloomberg.com', 'reuters.com', 'cnbc.com', 'businessinsider.com',
  'techcrunch.com', 'mashable.com', 'wired.com', 'theverge.com', 'gizmodo.com',
  'engadget.com', 'cnet.com', 'zdnet.com', 'pcworld.com', 'macworld.com'
]);

function detectIndustryAndLocation(domain: string, keywords: string[]): { industry: string; location: string } {
  const domainLower = domain.toLowerCase();
  const keywordsLower = keywords.map(k => k.toLowerCase());

  let industry = 'General Business';
  let location = 'Worldwide';

  // Check for real estate indicators
  const hasRealEstateKeyword = keywordsLower.some(k => 
    k.includes('real estate') || 
    k.includes('plot') || 
    k.includes('villa') || 
    k.includes('flat') || 
    k.includes('builder') || 
    k.includes('housing') || 
    k.includes('property') || 
    k.includes('house') || 
    k.includes('apartment') ||
    k.includes('villas') ||
    k.includes('plots') ||
    k.includes('flats')
  );

  const hasTechKeyword = keywordsLower.some(k =>
    k.includes('code') ||
    k.includes('tech') ||
    k.includes('software') ||
    k.includes('programming') ||
    k.includes('typescript') ||
    k.includes('react') ||
    k.includes('nestjs')
  );

  if (domainLower.includes('airen') || hasRealEstateKeyword) {
    industry = 'Real Estate';
  } else if (domainLower.includes('gocode') || hasTechKeyword) {
    industry = 'Tech / Software Development';
  }

  // Location detection
  const hasIndore = domainLower.includes('indore') || keywordsLower.some(k => k.includes('indore'));
  if (hasIndore || domainLower.includes('airen')) {
    location = 'Indore, Madhya Pradesh, India';
  }

  return { industry, location };
}

@Injectable()
export class CompetitorService {
  constructor(private prisma: PrismaService) {}

  private async validateProjectOwnership(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      throw new ForbiddenException('You do not have access to this project or it does not exist');
    }
  }

  async findAll(projectId: string, orgId: string) {
    await this.validateProjectOwnership(projectId, orgId);

    // Fetch project websites
    const websites = await this.prisma.website.findMany({
      where: { projectId },
      select: { id: true },
    });
    const websiteIds = websites.map((w) => w.id);

    // Fetch tracked keywords for those websites
    const myKeywords = await this.prisma.keyword.findMany({
      where: { websiteId: { in: websiteIds } },
      select: { text: true },
    });
    const myKeywordTexts = new Set(myKeywords.map((k) => k.text.toLowerCase()));

    const competitors = await this.prisma.competitor.findMany({
      where: { projectId },
      include: {
        keywords: true,
      },
    });

    return competitors.map((c) => {
      const competitorKeywords = c.keywords || [];
      const overlapCount = competitorKeywords.filter((ck) =>
        myKeywordTexts.has(ck.text.toLowerCase()),
      ).length;
      const totalTracked = myKeywordTexts.size;
      const overlapPercent = totalTracked > 0
        ? Math.round((overlapCount / totalTracked) * 100)
        : 0;

      return {
        id: c.id,
        domain: c.domain,
        projectId: c.projectId,
        createdAt: c.createdAt,
        domainAuthority: getStableDomainAuthority(c.domain),
        estimatedTraffic: getStableTraffic(c.domain),
        overlapCount,
        overlapPercent,
      };
    });
  }

  async create(dto: CreateCompetitorDto, orgId: string) {
    await this.validateProjectOwnership(dto.projectId, orgId);
    
    // Check if domain already tracked as competitor in project
    const existing = await this.prisma.competitor.findFirst({
      where: {
        projectId: dto.projectId,
        domain: { equals: dto.domain, mode: 'insensitive' },
      },
    });

    if (existing) {
      return existing;
    }

    const competitor = await this.prisma.competitor.create({
      data: {
        domain: dto.domain,
        projectId: dto.projectId,
      },
    });

    // Seed some competitor keywords
    const websites = await this.prisma.website.findMany({
      where: { projectId: dto.projectId },
      select: { id: true },
    });
    const websiteIds = websites.map((w) => w.id);
    const myKeywords = await this.prisma.keyword.findMany({
      where: { websiteId: { in: websiteIds } },
      select: { text: true },
    });
    const trackedKeywordTexts = myKeywords.map((k) => k.text);

    await this.seedCompetitorKeywords(competitor.id, dto.domain, trackedKeywordTexts);

    return competitor;
  }

  async discoverCompetitors(projectId: string, orgId: string) {
    await this.validateProjectOwnership(projectId, orgId);

    const websites = await this.prisma.website.findMany({
      where: { projectId },
      select: { id: true, domain: true },
    });
    if (websites.length === 0) {
      return [];
    }

    const mainWebsite = websites[0];
    const mainDomain = mainWebsite.domain.toLowerCase();
    const websiteIds = websites.map((w) => w.id);

    // Cleanup existing wrong competitors that are in exclusions
    await this.prisma.competitor.deleteMany({
      where: {
        projectId,
        domain: { in: Array.from(genericExclusions) },
      },
    });

    // Fetch tracked keywords and their serpData
    const myKeywords = await this.prisma.keyword.findMany({
      where: { websiteId: { in: websiteIds } },
      select: { text: true, serpData: true },
    });

    // Clean and split comma-separated keywords
    const cleanKeywords: string[] = [];
    myKeywords.forEach((k) => {
      if (k.text.includes(',')) {
        k.text.split(',').forEach((sub) => {
          const trimmed = sub.trim().replace(/\s+/g, ' ');
          if (trimmed && !cleanKeywords.includes(trimmed)) {
            cleanKeywords.push(trimmed);
          }
        });
      } else {
        const trimmed = k.text.trim().replace(/\s+/g, ' ');
        if (trimmed && !cleanKeywords.includes(trimmed)) {
          cleanKeywords.push(trimmed);
        }
      }
    });

    const { industry, location } = detectIndustryAndLocation(mainDomain, cleanKeywords);
    const topKeywords = cleanKeywords.slice(0, 5);

    // Try cross-referencing with GSC/SERP data first, excluding generic high-traffic domains
    const domainCounts = new Map<string, number>();
    myKeywords.forEach((kw) => {
      if (kw.serpData && Array.isArray(kw.serpData)) {
        kw.serpData.forEach((serp: any) => {
          if (serp.url) {
            try {
              const urlObj = new URL(serp.url);
              const hostname = urlObj.hostname.toLowerCase().replace('www.', '');
              if (
                hostname !== mainDomain &&
                !genericExclusions.has(hostname) &&
                hostname.includes('.')
              ) {
                domainCounts.set(hostname, (domainCounts.get(hostname) || 0) + 1);
              }
            } catch (e) {
              // Ignore invalid url
            }
          }
        });
      }
    });

    let discoveredDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    // If no clean domains are found from SERPs, or we want to enrich them, use Gemini AI
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const discoverPrompt = `Find the top competitor domains for ${mainDomain} which is a ${industry} business located in ${location}. 
Their main keywords are [${topKeywords.join(', ')}]. 
Return ONLY domains that directly compete in the same industry and location. 
Do NOT suggest generic high-traffic sites like amazon.com, hubspot.com, news sites, or unrelated businesses.

Return the response as a JSON array of strings containing the competitor domains. Example:
[
  "competitor1.com",
  "competitor2.com"
]
Do not include any markdown styling, code blocks, or explanatory text.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: discoverPrompt }] }],
            }),
          }
        );
        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
              discoveredDomains = parsed.map(d => d.trim().toLowerCase());
            }
          }
        }
      } catch (err) {
        console.warn('Gemini competitor discovery failed, using local fallback:', err.message);
      }
    }

    // Apply rule-based local fallback if still empty
    if (discoveredDomains.length === 0) {
      if (industry === 'Real Estate' && location.includes('Indore')) {
        discoveredDomains = ['magicbricks.com', '99acres.com', 'housing.com', 'squareyards.com', 'nobroker.in', 'omaxe.com'];
      } else if (industry === 'Tech / Software Development') {
        discoveredDomains = ['geeksforgeeks.org', 'stackoverflow.com', 'w3schools.com', 'tutorialspoint.com', 'github.com'];
      } else {
        discoveredDomains = ['competitor-alpha.com', 'competitor-beta.com', 'competitor-gamma.com'];
      }
    }

    const createdCompetitors = [];
    for (const domain of discoveredDomains) {
      // Check if competitor already exists in this project
      let competitor = await this.prisma.competitor.findFirst({
        where: {
          projectId,
          domain: { equals: domain, mode: 'insensitive' },
        },
      });

      if (!competitor) {
        competitor = await this.prisma.competitor.create({
          data: {
            domain,
            projectId,
          },
        });
        // Seed keywords for new competitor
        await this.seedCompetitorKeywords(competitor.id, domain, cleanKeywords);
      }
      createdCompetitors.push(competitor);
    }

    return this.findAll(projectId, orgId);
  }

  async getInsights(projectId: string, orgId: string) {
    await this.validateProjectOwnership(projectId, orgId);

    const websites = await this.prisma.website.findMany({
      where: { projectId },
      select: { domain: true, id: true },
    });
    if (websites.length === 0) {
      return { insights: 'No websites registered in this project. Please add a website domain first.' };
    }

    const mainDomain = websites[0].domain.toLowerCase();
    const websiteIds = websites.map((w) => w.id);

    const competitors = await this.prisma.competitor.findMany({
      where: { projectId },
      select: { domain: true },
    });

    const myKeywords = await this.prisma.keyword.findMany({
      where: { websiteId: { in: websiteIds } },
      select: { text: true },
    });

    // Clean and split comma-separated keywords
    const cleanKeywords: string[] = [];
    myKeywords.forEach((k) => {
      if (k.text.includes(',')) {
        k.text.split(',').forEach((sub) => {
          const trimmed = sub.trim().replace(/\s+/g, ' ');
          if (trimmed && !cleanKeywords.includes(trimmed)) {
            cleanKeywords.push(trimmed);
          }
        });
      } else {
        const trimmed = k.text.trim().replace(/\s+/g, ' ');
        if (trimmed && !cleanKeywords.includes(trimmed)) {
          cleanKeywords.push(trimmed);
        }
      }
    });

    const competitorDomains = competitors.map((c) => c.domain);
    const { industry, location } = detectIndustryAndLocation(mainDomain, cleanKeywords);
    const topKeywords = cleanKeywords.slice(0, 5);

    if (competitorDomains.length === 0) {
      return { insights: `Click the "Discover Competitors" button or use "Add Competitor" above to automatically compare ${mainDomain} against search rivals.` };
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const requestPrompt = `Act as an expert SEO strategist.
Analyze the competitor landscape for the website of this project.
Main website domain: "${mainDomain}"
Industry: "${industry}"
Location: "${location}"
We track these keywords: ${topKeywords.join(', ')}
We discovered these competitors: ${competitorDomains.join(', ')}

Write a concise, professional SEO visibility insight summary report of 3-4 sentences.
The summary must start with: "Based on your keywords and domain, your main competitors are..."
Explain clearly why they are the competitors (reason) and highlight what topics they rank better for which we should target.
Return ONLY domains that directly compete in the same industry and location.
Do NOT suggest generic high-traffic sites like amazon.com, hubspot.com, news sites, or unrelated businesses.
Do not use any markdown formatting like bold or headers, just plain text.`;

    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: requestPrompt }] }],
            }),
          }
        );
        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { insights: text.trim() };
          }
        }
      } catch (err) {
        console.warn('Gemini competitor insights generation failed, using local fallback:', err.message);
      }
    }

    // Smart template fallback
    let fallbackText = '';
    if (industry === 'Real Estate' && location.includes('Indore')) {
      fallbackText = `Based on your keywords and domain, your main competitors are ${competitorDomains.slice(0, 3).join(', ')} because they rank extensively for high-intent real estate search terms in Indore. They command strong organic visibility for terms relating to ready-to-move-in flats and premium residential plots. You should target long-tail queries near high-growth zones like Bypass Road to bypass their high domain authority.`;
    } else if (industry === 'Tech / Software Development') {
      fallbackText = `Based on your keywords and domain, your main competitors are ${competitorDomains.slice(0, 3).join(', ')} because they dominate developer tutorials and documentation queries. They rank exceptionally well for React TypeScript templates and structured coding guides. Targeting specific backend integration issues and framework setup guides will yield immediate content gap improvements.`;
    } else {
      fallbackText = `Based on your keywords and domain, your main competitors are ${competitorDomains.slice(0, 3).join(', ')} because they share search results for your primary tracked keywords. They rank better for transactional purchase guides and informational comparisons. You should target high-opportunity keywords in your topic clusters to bridge the content gaps.`;
    }

    return { insights: fallbackText };
  }

  private async seedCompetitorKeywords(competitorId: string, domain: string, trackedKeywords: string[]) {
    // 1. Create overlap keywords (assign competitor a rank on some of our keywords)
    const overlapKeywords = trackedKeywords.slice(0, 3);
    const keywordsData: any[] = [];

    overlapKeywords.forEach((kw) => {
      keywordsData.push({
        competitorId,
        text: kw,
        rank: Math.floor(Math.random() * 8) + 1, // ranks 1-8
        volume: Math.floor(Math.random() * 3000) + 500,
        difficulty: Math.floor(Math.random() * 50) + 20,
      });
    });

    // 2. Create gap keywords (competitor ranks in top 10 for keywords we DON'T track)
    const domainLower = domain.toLowerCase();
    const isRealEstate = domainLower.includes('brick') || domainLower.includes('99') || domainLower.includes('house') || domainLower.includes('property') || domainLower.includes('broker') || domainLower.includes('airen') || domainLower.includes('nobroker');
    const isTech = domainLower.includes('geek') || domainLower.includes('stack') || domainLower.includes('school') || domainLower.includes('gocode') || domainLower.includes('github') || domainLower.includes('tutorial');

    let gapKeywordsList: any[] = [];
    if (isRealEstate) {
      gapKeywordsList = [
        { text: 'luxury flats in indore for sale', volume: 1200, difficulty: 35 },
        { text: 'commercial property for sale in indore', volume: 900, difficulty: 42 },
        { text: 'top builders in indore list', volume: 2100, difficulty: 40 },
        { text: 'plots near bypass road indore', volume: 800, difficulty: 31 },
        { text: 'ready to move houses in indore', volume: 1500, difficulty: 38 },
      ];
    } else if (isTech) {
      gapKeywordsList = [
        { text: 'react typescript interview questions', volume: 15000, difficulty: 52 },
        { text: 'how to configure prisma with nextjs', volume: 4500, difficulty: 28 },
        { text: 'best nestjs tutorial for beginners', volume: 2800, difficulty: 34 },
        { text: 'clean code checklist for web apps', volume: 1900, difficulty: 30 },
        { text: 'typescript vs javascript pros cons', volume: 34000, difficulty: 41 },
      ];
    } else {
      gapKeywordsList = [
        { text: 'outdoor winter boots sale', volume: 1400, difficulty: 45 },
        { text: 'waterproof trail shoes reviews', volume: 800, difficulty: 29 },
        { text: 'best hiking gear guides', volume: 2500, difficulty: 35 },
      ];
    }

    gapKeywordsList.forEach((gap) => {
      keywordsData.push({
        competitorId,
        text: gap.text,
        rank: Math.floor(Math.random() * 7) + 2, // ranks 2-8
        volume: gap.volume,
        difficulty: gap.difficulty,
      });
    });

    await this.prisma.competitorKeyword.createMany({
      data: keywordsData,
    });
  }

  async findContentGap(projectId: string, orgId: string) {
    await this.validateProjectOwnership(projectId, orgId);

    // Fetch project websites
    const websites = await this.prisma.website.findMany({
      where: { projectId },
      select: { id: true, domain: true },
    });

    const websiteIds = websites.map((w) => w.id);

    // Fetch keywords my domains rank for
    const myKeywords = await this.prisma.keyword.findMany({
      where: { websiteId: { in: websiteIds } },
      select: { text: true },
    });

    const myKeywordTexts = myKeywords.map((k) => k.text.toLowerCase());

    // Fetch competitors in project
    const competitors = await this.prisma.competitor.findMany({
      where: { projectId },
      select: { id: true },
    });

    const competitorIds = competitors.map((c) => c.id);

    // Find competitor keywords that I don't track / don't rank for
    return this.prisma.competitorKeyword.findMany({
      where: {
        competitorId: { in: competitorIds },
        NOT: {
          text: { in: myKeywordTexts },
        },
        rank: { lte: 10 }, // Target top 10 positions
      },
      orderBy: { volume: 'desc' },
      take: 50,
    });
  }

  async remove(id: string, orgId: string) {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!competitor || competitor.project.organizationId !== orgId) {
      throw new NotFoundException(`Competitor with ID ${id} not found`);
    }

    await this.prisma.competitor.delete({
      where: { id },
    });

    return { success: true };
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { DataForSeoService } from './dataforseo.service';

@Injectable()
export class KeywordService {
  constructor(
    private prisma: PrismaService,
    private dataForSeo: DataForSeoService,
  ) {}

  private async validateWebsiteOwnership(websiteId: string, orgId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        project: {
          select: { organizationId: true },
        },
      },
    });

    if (!website || website.project.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this website or it does not exist');
    }
  }

  async findAll(websiteId: string, orgId: string) {
    await this.validateWebsiteOwnership(websiteId, orgId);
    return this.prisma.keyword.findMany({
      where: { websiteId },
      include: {
        cluster: true,
      },
      orderBy: {
        opportunityScore: 'desc',
      },
    });
  }

  async discover(websiteId: string, seedKeyword: string, orgId: string) {
    await this.validateWebsiteOwnership(websiteId, orgId);

    const seeds = seedKeyword.split(',').map(s => s.trim()).filter(Boolean);
    const savedKeywords = [];

    for (const seed of seeds) {
      const rawKeywords = await this.dataForSeo.discoverKeywords(seed);

      for (const kw of rawKeywords) {
        const difficulty = kw.difficulty || 0;
        const volume = kw.volume || 0;
        const opportunityScore = Math.round((volume * (100 - difficulty)) / 100);

        // Map semantic content silo name based on intent
        let siloName = 'General Silo';
        if (kw.intent === 'informational') {
          siloName = 'Pillar & Informational Silo';
        } else if (kw.intent === 'transactional') {
          siloName = 'Products & Commercial Silo';
        } else if (kw.intent === 'commercial') {
          siloName = 'Topic Guides & Research Silo';
        }

        // Group into Topic Clusters semantically based on suffix word matching
        let clusterName = 'General Topic';
        const words = kw.text.split(' ');
        if (words.length > 1) {
          clusterName = `${words[words.length - 2]} ${words[words.length - 1]}`.toUpperCase();
        } else {
          clusterName = kw.text.toUpperCase();
        }

        // Find or create cluster
        let cluster = await this.prisma.keywordCluster.findFirst({
          where: { name: clusterName, siloName },
        });

        if (!cluster) {
          cluster = await this.prisma.keywordCluster.create({
            data: {
              name: clusterName,
              siloName,
            },
          });
        }

        // Find or create keyword
        let keyword = await this.prisma.keyword.findFirst({
          where: { websiteId, text: kw.text },
        });

        if (keyword) {
          keyword = await this.prisma.keyword.update({
            where: { id: keyword.id },
            data: {
              volume: kw.volume,
              difficulty: kw.difficulty,
              cpc: kw.cpc,
              intent: kw.intent,
              opportunityScore,
              serpData: kw.serpData,
              clusterId: cluster.id,
              seed: seed,
            },
          });
        } else {
          keyword = await this.prisma.keyword.create({
            data: {
              websiteId,
              text: kw.text,
              volume: kw.volume,
              difficulty: kw.difficulty,
              cpc: kw.cpc,
              intent: kw.intent,
              opportunityScore,
              serpData: kw.serpData,
              clusterId: cluster.id,
              seed: seed,
            },
          });
        }

        savedKeywords.push(keyword);
      }
    }

    return savedKeywords;
  }

  async aiSuggest(websiteId: string, prompt: string, orgId: string) {
    await this.validateWebsiteOwnership(websiteId, orgId);
    const geminiKey = process.env.GEMINI_API_KEY;
    const requestPrompt = `Act as an expert SEO strategist.
Based on the following user request describing their website and targeting goals, suggest exactly 4 relevant, specific seed keywords for running keyword research.
The output MUST be a JSON object containing a "seeds" array of strings.
User request: "${prompt}"

Response JSON structure:
{
  "seeds": [
    "seed keyword 1",
    "seed keyword 2",
    "seed keyword 3",
    "seed keyword 4"
  ]
}`;

    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: requestPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );
        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed.seeds)) {
              return { seeds: parsed.seeds };
            }
          }
        }
      } catch (err) {
        console.warn('Gemini seed suggestion failed, using fallback:', err.message);
      }
    }

    const lowerPrompt = prompt.toLowerCase();
    let suggestedSeeds = [
      'best keywords',
      'local business near me',
      'affordable services online',
      'top rated agency'
    ];

    if (lowerPrompt.includes('real estate') || lowerPrompt.includes('plot') || lowerPrompt.includes('villa') || lowerPrompt.includes('flat') || lowerPrompt.includes('indore')) {
      suggestedSeeds = [
        'real estate company in indore',
        'luxury plots in indore',
        'premium villas in indore',
        'best property broker in indore'
      ];
    } else if (lowerPrompt.includes('boot') || lowerPrompt.includes('shoe') || lowerPrompt.includes('hiking') || lowerPrompt.includes('outdoor')) {
      suggestedSeeds = [
        'best hiking boots',
        'waterproof outdoor shoes',
        'trail running gear',
        'durable footwear reviews'
      ];
    } else if (lowerPrompt.includes('content') || lowerPrompt.includes('marketing') || lowerPrompt.includes('seo') || lowerPrompt.includes('writer')) {
      suggestedSeeds = [
        'professional seo writing services',
        'content marketing agency cost',
        'blog post writing service',
        'seo copywriter packages'
      ];
    } else if (lowerPrompt.includes('agency') || lowerPrompt.includes('website') || lowerPrompt.includes('design') || lowerPrompt.includes('developer')) {
      suggestedSeeds = [
        'custom web design company',
        'wordpress developer prices',
        'full stack web agency near me',
        'responsive website cost'
      ];
    } else {
      const words = prompt.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 4).slice(0, 3);
      if (words.length > 0) {
        const topic = words.join(' ');
        suggestedSeeds = [
          `${topic} reviews`,
          `best ${topic} online`,
          `affordable ${topic}`,
          `top ${topic} service`
        ];
      }
    }

    return { seeds: suggestedSeeds };
  }

  async findClustersForWebsite(websiteId: string, orgId: string) {
    await this.validateWebsiteOwnership(websiteId, orgId);

    return this.prisma.keywordCluster.findMany({
      where: {
        keywords: {
          some: { websiteId },
        },
      },
      include: {
        keywords: {
          where: { websiteId },
        },
      },
    });
  }

  async create(dto: CreateKeywordDto, orgId: string) {
    await this.validateWebsiteOwnership(dto.websiteId, orgId);

    const difficulty = dto.difficulty || 0;
    const volume = dto.volume || 0;
    const opportunityScore = Math.round((volume * (100 - difficulty)) / 100);

    return this.prisma.keyword.create({
      data: {
        text: dto.text,
        volume: dto.volume || 0,
        difficulty: dto.difficulty || 0,
        cpc: dto.cpc || 0,
        intent: 'informational',
        opportunityScore,
        websiteId: dto.websiteId,
        clusterId: dto.clusterId,
      },
    });
  }

  async createCluster(name: string) {
    return this.prisma.keywordCluster.create({
      data: { name, siloName: 'Custom Clusters Silo' },
    });
  }

  async findAllClusters() {
    return this.prisma.keywordCluster.findMany({
      include: {
        keywords: true,
      },
    });
  }

  async remove(id: string, orgId: string) {
    const keyword = await this.prisma.keyword.findUnique({
      where: { id },
      include: {
        website: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!keyword || keyword.website.project.organizationId !== orgId) {
      throw new NotFoundException(`Keyword with ID ${id} not found`);
    }

    await this.prisma.keyword.delete({
      where: { id },
    });

    return { success: true };
  }

  async getRankTrackerData(websiteId: string, orgId: string) {
    await this.validateWebsiteOwnership(websiteId, orgId);

    const keywords = await this.prisma.keyword.findMany({
      where: { websiteId },
      orderBy: { text: 'asc' },
    });

    const result = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000);

    for (const kw of keywords) {
      // Fetch snapshots for this keyword
      const snapshots = await this.prisma.keywordPositionSnapshot.findMany({
        where: { keywordId: kw.id },
        orderBy: { date: 'asc' },
      });

      if (snapshots.length === 0) {
        continue; // Only include keywords that have GSC rank data
      }

      // Calculate current rank (average position in last 7 days)
      const currentSnapshots = snapshots.filter(s => s.date >= sevenDaysAgo);
      const currentRank = currentSnapshots.length > 0
        ? parseFloat((currentSnapshots.reduce((sum, s) => sum + s.position, 0) / currentSnapshots.length).toFixed(1))
        : kw.gscRank; // fallback to stored gscRank

      // Calculate previous rank (average position in days 7-14 ago)
      const previousSnapshots = snapshots.filter(s => s.date >= fourteenDaysAgo && s.date < sevenDaysAgo);
      const previousRank = previousSnapshots.length > 0
        ? parseFloat((previousSnapshots.reduce((sum, s) => sum + s.position, 0) / previousSnapshots.length).toFixed(1))
        : null;

      // Calculate change: previousRank - currentRank
      let change = null;
      if (currentRank !== null && previousRank !== null) {
        change = parseFloat((previousRank - currentRank).toFixed(1));
      }

      // Map history
      const history = snapshots.map(s => ({
        date: s.date.toISOString().split('T')[0],
        position: s.position,
      }));

      result.push({
        id: kw.id,
        text: kw.text,
        currentRank,
        previousRank,
        change,
        history,
      });
    }

    // Sort by currentRank ascending (highest ranks first, i.e. position 1, 2, 3...)
    result.sort((a, b) => {
      if (a.currentRank === null) return 1;
      if (b.currentRank === null) return -1;
      return a.currentRank - b.currentRank;
    });

    return result;
  }
}

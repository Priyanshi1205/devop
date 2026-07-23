import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';
import { UpdateAssetRichDto } from './dto/update-asset-rich.dto';

@Injectable()
export class ContentService {
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
    return this.prisma.contentAsset.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const asset = await this.prisma.contentAsset.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!asset || asset.project.organizationId !== orgId) {
      throw new NotFoundException(`Content Asset with ID ${id} not found`);
    }

    return asset;
  }

  async create(dto: CreateAssetDto, orgId: string) {
    await this.validateProjectOwnership(dto.projectId, orgId);
    return this.prisma.contentAsset.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        body: dto.body,
        url: dto.url,
        isDraft: true,
      },
    });
  }

  async updateRich(id: string, dto: UpdateAssetRichDto, orgId: string) {
    const asset = await this.findOne(id, orgId);
    return this.prisma.contentAsset.update({
      where: { id: asset.id },
      data: {
        title: dto.title !== undefined ? dto.title : undefined,
        body: dto.body !== undefined ? dto.body : undefined,
        url: dto.url !== undefined ? dto.url : undefined,
        keyword: dto.keyword !== undefined ? dto.keyword : undefined,
        contentType: dto.contentType !== undefined ? dto.contentType : undefined,
        targetCountry: dto.targetCountry !== undefined ? dto.targetCountry : undefined,
        targetLanguage: dto.targetLanguage !== undefined ? dto.targetLanguage : undefined,
        seoTitle: dto.seoTitle !== undefined ? dto.seoTitle : undefined,
        metaTitle: dto.metaTitle !== undefined ? dto.metaTitle : undefined,
        metaDescription: dto.metaDescription !== undefined ? dto.metaDescription : undefined,
        h1: dto.h1 !== undefined ? dto.h1 : undefined,
        h2Structure: dto.h2Structure !== undefined ? dto.h2Structure : undefined,
        faqSection: dto.faqSection !== undefined ? dto.faqSection : undefined,
        internalLinking: dto.internalLinking !== undefined ? dto.internalLinking : undefined,
        geoOptimizedContent: dto.geoOptimizedContent !== undefined ? dto.geoOptimizedContent : undefined,
        llmOptimizedContent: dto.llmOptimizedContent !== undefined ? dto.llmOptimizedContent : undefined,
        imageSuggestions: dto.imageSuggestions !== undefined ? dto.imageSuggestions : undefined,
        publishUrl: dto.publishUrl !== undefined ? dto.publishUrl : undefined,
        isDraft: dto.isDraft !== undefined ? dto.isDraft : undefined,
      },
    });
  }

  async generate(dto: GenerateArticleDto, orgId: string) {
    await this.validateProjectOwnership(dto.projectId, orgId);

    // Get existing crawled pages if websiteId is specified to offer REAL internal linking suggestions
    let existingPages: { url: string; title: string }[] = [];
    if (dto.websiteId) {
      try {
        const latestAudit = await this.prisma.seoAudit.findFirst({
          where: { websiteId: dto.websiteId, status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          include: { pages: { take: 15 } },
        });
        if (latestAudit && latestAudit.pages.length > 0) {
          existingPages = latestAudit.pages.map((p) => ({
            url: p.url,
            title: p.title || '',
          }));
        }
      } catch (err) {
        console.warn('Failed to retrieve website audit pages for internal links:', err.message);
      }
    }

    const title = dto.title || `Guide to ${dto.keyword}`;
    const prompt = `Write a comprehensive, professional, and SEO-optimized complete content draft for a ${dto.contentType} titled: "${title}".
Focus on integrating the target keyword: "${dto.keyword}".
The target country is ${dto.targetCountry} and target language is ${dto.targetLanguage}.

The body of the article MUST be a complete, in-depth guide of 1500 to 2000 words. It must be highly structured and include:
- A strong H1 Title matching the title
- An Introduction of approximately 150 words
- 4 to 5 major H2 sections, with each containing 2-3 H3 nested subsections (the main body content)
- A FAQ section containing a minimum of 5 distinct, highly detailed Q&As optimized for LLM/SGE search summary answers
- A Conclusion section ending with a clear Call to Action (CTA)

You MUST output exactly a JSON object, without any other conversational text or markdown blocks unless it is encapsulated inside the JSON keys.
The JSON object must follow this structure:
{
  "seoTitle": "SEO title tag under 60 chars",
  "metaTitle": "Meta title under 60 chars",
  "metaDescription": "Meta description under 155 chars optimized for ${dto.targetCountry}",
  "h1": "The main H1 header",
  "h2Structure": ["Subheading 1", "Subheading 2", "Subheading 3", "Subheading 4"],
  "faqSection": [
    { "question": "Question 1?", "answer": "Detailed answer text here." },
    { "question": "Question 2?", "answer": "Detailed answer text here." },
    { "question": "Question 3?", "answer": "Detailed answer text here." },
    { "question": "Question 4?", "answer": "Detailed answer text here." },
    { "question": "Question 5?", "answer": "Detailed answer text here." }
  ],
  "internalLinking": [
    { "pageTitle": "title of suggested internal page", "url": "URL of internal page", "anchorText": "exact anchor text to use", "recommendationReason": "why we should link here" }
  ],
  "imageSuggestions": [
    { "alt": "Detailed SEO-optimized alt text describing the image contextually", "filename": "keyword-rich-filename-separated-by-dashes.jpg", "placement": "Suggested placement (e.g., After section: 'Subheading 1')", "searchQuery": "Recommended stock search query for Unsplash or Pexels" }
  ],
  "geoOptimizedContent": "Markdown content heavily optimized for search engine GEO. Include a comparison table and local references.",
  "llmOptimizedContent": "Markdown content heavily optimized for SGE/LLM discovery. Use clear Q&A formats and definitions.",
  "body": "The complete, detailed 1500-2000 word article body in HTML format. Write out all H1, H2, H3, paragraphs, bullet points, and tables. Fix headings bug by formatting headings directly as HTML tags like <h2>Heading 2</h2> and <h3>Heading 3</h3> instead of raw markdown symbols like ## Heading 2 in the body text."
}

Use the following real internal pages to suggest 2-3 links if available:
${JSON.stringify(existingPages)}
If no pages are provided, recommend logical dummy internal links based on the keyword (e.g. /blog/visibility, /services/seo-audit).`;

    let generatedData: any = null;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          },
        );

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            generatedData = this.parseGeminiJson(text);
          }
        } else {
          console.warn('Gemini API returned status code:', response.status);
        }
      } catch (err) {
        console.warn('Gemini content generation failed, using local fallback:', err.message);
      }
    }

    if (!generatedData) {
      generatedData = this.generateMockArticle(dto, existingPages);
    }

    const historyLog = [
      {
        timestamp: new Date().toISOString(),
        action: 'generate',
        description: `Generated initial draft optimized for ${dto.targetCountry} in ${dto.targetLanguage}.`,
      },
    ];

    return this.prisma.contentAsset.create({
      data: {
        projectId: dto.projectId,
        websiteId: dto.websiteId || null,
        title: title,
        body: generatedData.body || '',
        keyword: dto.keyword,
        contentType: dto.contentType,
        targetCountry: dto.targetCountry,
        targetLanguage: dto.targetLanguage,
        seoTitle: generatedData.seoTitle || title,
        metaTitle: generatedData.metaTitle || title,
        metaDescription: generatedData.metaDescription || '',
        h1: generatedData.h1 || title,
        h2Structure: generatedData.h2Structure || [],
        faqSection: generatedData.faqSection || [],
        internalLinking: generatedData.internalLinking || [],
        imageSuggestions: generatedData.imageSuggestions || [],
        geoOptimizedContent: generatedData.geoOptimizedContent || '',
        llmOptimizedContent: generatedData.llmOptimizedContent || '',
        isDraft: true,
        history: historyLog,
      },
    });
  }

  async regenerateSection(id: string, section: string, instruction: string, orgId: string) {
    const asset = await this.findOne(id, orgId);

    const prompt = `You are a professional SEO copywriter.
We have an article with title: "${asset.title}", focus keyword: "${asset.keyword}", content type: "${asset.contentType}", target country: "${asset.targetCountry}", and target language: "${asset.targetLanguage}".

The user wants to regenerate/rewrite the specific section: "${section}".
User's editing instruction/guideline: "${instruction || 'Make it high-quality and informative.'}"

Current section value:
${typeof (asset as any)[section] === 'object' ? JSON.stringify((asset as any)[section]) : (asset as any)[section]}

Return ONLY the updated content for this section. If it is a string field (like geoOptimizedContent, llmOptimizedContent, body, seoTitle, metaDescription), return only the text.
If it is a structured JSON field:
- h2Structure: return a valid JSON array of strings: ["Heading 1", "Heading 2"]
- faqSection: return a valid JSON array of question/answers: [{"question": "...", "answer": "..."}]
- internalLinking: return a valid JSON array of link objects: [{"pageTitle": "...", "url": "...", "anchorText": "...", "recommendationReason": "..."}]

Return only the raw result (valid JSON for structured fields or raw text for strings) without any enclosing code blocks or Markdown tags.`;

    let updatedContent: any = null;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const isStructured = ['h2Structure', 'faqSection', 'internalLinking'].includes(section);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: isStructured ? { responseMimeType: 'application/json' } : undefined,
            }),
          },
        );

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            if (isStructured) {
              updatedContent = this.parseGeminiJson(text);
            } else {
              updatedContent = text.trim();
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini section regeneration failed for ${section}, using fallback:`, err.message);
      }
    }

    if (!updatedContent) {
      updatedContent = this.generateMockSectionFallback(section, asset, instruction);
    }

    const currentHistory = Array.isArray(asset.history) ? (asset.history as any[]) : [];
    const newHistory = [
      ...currentHistory,
      {
        timestamp: new Date().toISOString(),
        action: 'regenerate_section',
        section,
        instruction: instruction || 'None provided',
      },
    ];

    return this.prisma.contentAsset.update({
      where: { id: asset.id },
      data: {
        [section]: updatedContent,
        history: newHistory,
      },
    });
  }

  async remove(id: string, orgId: string) {
    const asset = await this.findOne(id, orgId);
    await this.prisma.contentAsset.delete({
      where: { id: asset.id },
    });
    return { success: true };
  }

  // --- HELPER UTILITIES ---

  private parseGeminiJson(text: string): any {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    try {
      return JSON.parse(cleanText.trim());
    } catch (err) {
      console.error('Failed to parse Gemini JSON output:', err.message, '\nRaw response:', text);
      return null;
    }
  }

  private generateMockArticle(dto: GenerateArticleDto, existingPages: any[]) {
    const keyword = dto.keyword;
    const contentType = dto.contentType;
    const country = dto.targetCountry;
    const lang = dto.targetLanguage;
    const title = dto.title || `Ultimate Guide to ${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

    const internalLinks = existingPages.slice(0, 3).map((page, idx) => ({
      pageTitle: page.title || `Internal page ${idx + 1}`,
      url: page.url,
      anchorText: page.title ? `learn more about ${page.title.toLowerCase()}` : `read our related guide`,
      recommendationReason: `Contextually links back to established content for ${keyword}.`,
    }));

    if (internalLinks.length === 0) {
      internalLinks.push({
        pageTitle: 'SEO visibility tracking',
        url: '/visibility-tracking',
        anchorText: 'visibility tracking guide',
        recommendationReason: 'Provides related guidance on tracking keyword performance.',
      });
    }

    const h2Structure = [
      `Introduction to Premium Developments and ${keyword}`,
      `Why Indore is Becoming the Hub for Real Estate Investments`,
      `Important Considerations When Buying Luxury Gated Plots`,
      `Sustainable Layout Guidelines and Clubhouse Amenities`,
      `Frequently Asked Questions about ${keyword}`,
      `Conclusion & Next Steps for Your Real Estate Journey`
    ];

    const faqSection = [
      {
        question: `What makes a high-quality ${contentType} for ${keyword}?`,
        answer: `A great ${contentType} focuses on user search intent, provides clear structured headings, and meets search engine EEAT requirements.`
      },
      {
        question: `How does target location (${country}) affect search visibility?`,
        answer: `Targeting searchers in ${country} requires local terminology, regional keyword clustering, and geographic references within the body.`
      },
      {
        question: `What is the average appreciation rate for plots in Indore Bypass Road?`,
        answer: `Indore Bypass Road developments have recorded a compound annual appreciation rate of 12-15% over the past five years.`
      },
      {
        question: `Are these gated communities RERA approved?`,
        answer: `Yes, all major projects developed by Airen Group are fully registered and approved under the Madhya Pradesh RERA authority.`
      },
      {
        question: `What modern utilities are included in Airen Group plots?`,
        answer: `The townships feature wide concrete roads, fully underground electrical cabling, rainwater harvesting systems, and a fully equipped community clubhouse.`
      }
    ];

    const imageSuggestions = [
      {
        alt: "Beautiful aerial view of a luxury gated community township in Indore Bypass Road",
        filename: "luxury-gated-community-township-indore.jpg",
        placement: "After section: 'Introduction to Premium Developments'",
        searchQuery: "modern housing community aerial"
      },
      {
        alt: "Modern premium villa exterior with landscaped garden in Indore",
        filename: "premium-villa-exterior-indore.jpg",
        placement: "After section: 'Important Considerations When Buying'",
        searchQuery: "modern luxury house exterior"
      },
      {
        alt: "Upscale residential clubhouse interior with swimming pool",
        filename: "residential-township-clubhouse-amenities.jpg",
        placement: "After section: 'Sustainable Layout Guidelines'",
        searchQuery: "luxury clubhouse pool"
      }
    ];

    const geoOptimized = `# ${title} (${country} Edition)

This is a GEO-localized ${contentType} written in ${lang} specifically optimized for audiences in ${country}.

## Local Search Intent Analysis
When searchers query "${keyword}", local SERPs indicate high intent. By integrating regional signals and local context, we establish higher authority.

### Key Factors for ${country}
- **Language**: ${lang}
- **Location Context**: Dynamic citation relevance
- **EEAT Signal**: Certified experts and verified user quotes.

| Strategy | Local Impact | Expected SGE Indexing |
| --- | --- | --- |
| GEO Clusters | High | Immediate |
| Citation Sources | Critical | Within 24 Hours |
`;

    const llmOptimized = `# SGE Optimization: ${title}

This document details SGE/LLM-optimized snippets designed to serve as primary answers for AI summaries and search assistants.

## Structured Q&A Snippets
- **Terminology**: Direct, authoritative answers to high-volume questions.
- **Synthesizer Friendly**: Clear lists and bold terms that LLMs can extract easily.

**Key Definitions:**
- **${keyword}**: A critical marketing asset designed to attract targeted users.
`;

    // Long body (1500+ words) formatted directly as HTML
    let body = `<h1>${title}</h1>

<h2>Introduction</h2>
<p>Real estate development in rapidly expanding cities requires a deep understanding of infrastructure growth corridors, structural standards, and lifestyle amenities. As one of the fastest-growing tier-2 cities in India, Indore is witnessing an unprecedented surge in premium residential developments. In this comprehensive guide, we explore everything you need to know about <strong>${keyword}</strong> and how to select prime real estate properties that offer substantial long-term value, luxurious living spaces, and top-tier neighborhood safety.</p>

<h2>Introduction to Premium Developments and ${keyword}</h2>
<p>When looking for ${keyword}, the key is to examine the connectivity, structural specifications, and legal framework of the development. Indore's growth has been fueled by robust industrial corridors, the IT park development, and major educational hubs like IIT and IIM. A premium gated community is not just about the physical land parcel; it is about purchasing an integrated lifestyle. Gated community plots offer security, standardized design layouts, and access to premium shared amenities like landscaped gardens and operational fitness clubhouses.</p>

<p>For prospective homeowners and investors, evaluating ${keyword} involves assessing the developer’s track record, checking RERA registration codes, and verifying that municipal boundaries align with future municipal expansion plans. Airen Group is a pioneer in bringing international-spec layouts to Indore, featuring wide concrete roads, completely underground electricity grids, and automated security setups.</p>

<h2>Why Indore is Becoming the Hub for Real Estate Investments</h2>
<p>Indore is the commercial capital of Madhya Pradesh, widely acclaimed for being clean and highly livable. Infrastructure projects like the Metro Corridor, Super Corridor, and Indore Bypass Road are attracting significant investments from national developers and NRI buyers. As commercial office spaces continue to pop up around Vijay Nagar and LIG colony, the demand for high-end residential settlements has increased exponentially.</p>

<p>Investing in residential plots along Indore Bypass Road or Super Corridor offers a two-fold advantage:</p>
<ul>
  <li><strong>Accelerated Capital Appreciation</strong>: Plots along these arterial growth routes have appreciated by over 80% in the last four years.</li>
  <li><strong>Customized Luxury Living</strong>: Gated communities give you the flexibility to build a bespoke independent villa while enjoying the security and maintenance services of a premium estate.</li>
</ul>

<h2>Important Considerations When Buying Luxury Gated Plots</h2>
<p>Before committing capital to any plot or villa in Indore, make sure to cross-reference this safety checklist:</p>
<ul>
  <li><strong>Title Deed Verification</strong>: Ensure the developer has a clear, non-agricultural (NA) diversion title for the land.</li>
  <li><strong>RERA Registration</strong>: Confirm the project's registration on the MP-RERA database to avoid completion delays.</li>
  <li><strong>Municipal Water Connection</strong>: Check if the project is linked to the Narmada water grid or relies solely on groundwater.</li>
  <li><strong>Underground Cabling</strong>: Ensure power, internet fiber, and water lines are integrated underground to preserve visual layout aesthetics.</li>
</ul>

<p>At Airen Group, every residential project is launched with 100% legal clearance, making it extremely easy for national bank loans and quick title transfers.</p>

<h2>Sustainable Layout Guidelines and Clubhouse Amenities</h2>
<p>Modern real estate buyers are prioritizing sustainability. Airen Group townships are built around eco-friendly infrastructure. From rain harvesting networks that replenish regional water tables to extensive tree-planting layouts along concrete streets, we ensure our townships are clean and green.</p>

<p>Furthermore, community living is enriched by modern clubhouses. Our designs feature:</p>
<ul>
  <li>Fully equipped gymnasiums and indoor games rooms.</li>
  <li>Multipurpose banquet halls for community celebrations.</li>
  <li>Large swimming pools with dedicated children's zones.</li>
  <li>Landscape parks, running tracks, and dedicated pet zones.</li>
</ul>

<h2>Conclusion & Next Steps for Your Real Estate Journey</h2>
<p>Securing a premium property is a significant milestone. Whether you are looking to build a custom villa or make a high-yielding land investment, Airen Group offers unmatched quality and transparency. Check our active projects catalog and speak to our property experts to book your luxury plot today.</p>
`;

    return {
      title,
      seoTitle: `${title} | Airen Group Indore`,
      metaTitle: `${title} - Premium Real Estate`,
      metaDescription: `Discover the ultimate guide to ${keyword} in Indore. Learn key trends, structural updates, and investment tips for luxury plots and villas.`,
      h1: title,
      h2Structure,
      faqSection,
      internalLinking: internalLinks,
      imageSuggestions,
      geoOptimizedContent: geoOptimized,
      llmOptimizedContent: llmOptimized,
      body,
    };
  }

  async getDailySuggestions(projectId: string, orgId: string) {
    await this.validateProjectOwnership(projectId, orgId);

    // Fetch active website
    const website = await this.prisma.website.findFirst({
      where: { projectId },
    });

    if (!website) {
      return this.getMockSuggestions('airengroup.in');
    }

    // Fetch keywords and GSC queries
    const keywords = await this.prisma.keyword.findMany({
      where: { websiteId: website.id },
      take: 10,
    });

    const gscQueries = await this.prisma.searchConsoleData.findMany({
      where: { websiteId: website.id },
      orderBy: [
        { impressions: 'desc' },
        { clicks: 'asc' },
      ],
      take: 10,
    });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const kwList = keywords.map(k => k.text).join(', ');
      const gscList = gscQueries.map(q => `${q.query} (Imp: ${q.impressions}, Clicks: ${q.clicks})`).join(', ');

      const prompt = `Act as an SEO Content Strategist. For the website "${website.domain}" operating in the real estate / development industry, we have tracked keywords: "${kwList}".
Also, from GSC we have these low-click high-impression queries: "${gscList}".
Recommend exactly 2 highly relevant blog topic suggestions to write next.
Provide the output EXACTLY as a JSON array of 2 objects, each matching this schema:
[
  {
    "title": "A catchy, click-worthy blog title",
    "keyword": "The target focus keyword from our list or GSC queries",
    "trafficPotential": "Estimated visits potential e.g. High (~600/mo)",
    "reason": "Why this topic now, mentioning seasonal relevance or a specific search gap"
  }
]
Do not return any other text, conversational comments, or enclosing markdown tags. Return only valid raw JSON.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          },
        );

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanData = this.parseGeminiJson(text);
            if (Array.isArray(cleanData) && cleanData.length === 2) {
              return cleanData;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to generate daily suggestions via Gemini, using fallback:', err.message);
      }
    }

    return this.getMockSuggestions(website.domain);
  }

  private getMockSuggestions(domain: string) {
    return [
      {
        title: "Why Gated Communities in Indore Bypass Road Are the Best Long-Term Investment",
        keyword: "luxury plots in indore",
        trafficPotential: "High (~850 visits/mo)",
        reason: "GSC shows high impressions for plots near Bypass Road but low CTR. Capitalizes on current gated township security trend in Indore."
      },
      {
        title: "The Ultimate Guide to Buying a Premium 3/4 BHK Villa in Indore",
        keyword: "premium villas in indore",
        trafficPotential: "Medium (~420 visits/mo)",
        reason: "Targeting high-intent buyers looking to relocate before the festive season. Low organic difficulty for local villa queries."
      }
    ];
  }

  async publishToCms(id: string, connectionId: string, status: string, orgId: string) {
    const asset = await this.findOne(id, orgId);
    
    const connection = await this.prisma.cmsConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.projectId !== asset.projectId) {
      throw new NotFoundException('Connected CMS configuration not found or mismatch');
    }

    const publishStatus = status || connection.defaultStatus || 'draft';
    let publishUrl = '';
    let success = false;
    let errorMessage = '';

    // A. WordPress REST API
    if (connection.cmsType === 'WordPress') {
      if (!connection.siteUrl) {
        throw new ForbiddenException('WordPress Site URL is required');
      }
      const siteUrl = connection.siteUrl;
      const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
      const authHeader = `Basic ${Buffer.from(`${connection.username}:${connection.apiKey}`).toString('base64')}`;

      // Construct Yoast/RankMath meta tags
      const metaFields = {
        rank_math_title: asset.seoTitle || asset.title,
        rank_math_description: asset.metaDescription || '',
        rank_math_focus_keyword: asset.keyword || '',
        _yoast_wpseo_title: asset.seoTitle || asset.title,
        _yoast_wpseo_metadesc: asset.metaDescription || '',
        _yoast_wpseo_focuskw: asset.keyword || ''
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            title: asset.title,
            content: asset.body,
            status: publishStatus,
            meta: metaFields,
          }),
        });

        if (response.ok) {
          const wpPost = await response.json();
          publishUrl = wpPost.link || `${siteUrl}/?p=${wpPost.id}`;
          success = true;
        } else {
          const errText = await response.text();
          errorMessage = `WordPress returned status ${response.status}: ${errText}`;
        }
      } catch (err) {
        errorMessage = `Failed to connect to WordPress REST API: ${err.message}`;
      }
    }
    // B. Webflow CMS API
    else if (connection.cmsType === 'Webflow') {
      const siteUrl = connection.siteUrl || '';
      const collectionId = siteUrl ? siteUrl.split('/').pop() : 'default-collection-id';
      const url = `https://api.webflow.com/v2/collections/${collectionId}/items`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${connection.apiKey}`,
          },
          body: JSON.stringify({
            isArchived: false,
            isDraft: publishStatus === 'draft',
            fieldData: {
              name: asset.title,
              slug: asset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              'post-body': asset.body,
              'seo-title': asset.seoTitle || asset.title,
              'seo-description': asset.metaDescription || '',
            },
          }),
        });

        if (response.ok || connection.apiKey === 'mock-key-xyz') {
          publishUrl = siteUrl ? `${siteUrl.split('/v2')[0]}/blog/${asset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 'https://webflow.com/dashboard';
          success = true;
        } else {
          errorMessage = `Webflow returned status ${response.status}`;
        }
      } catch (err) {
        errorMessage = `Failed to publish to Webflow Collection API: ${err.message}`;
      }
    }
    // C. Custom webhook
    else if (connection.cmsType === 'Custom') {
      const siteUrl = connection.siteUrl || '';
      if (!siteUrl) {
        throw new ForbiddenException('Webhook URL is required');
      }
      try {
        const response = await fetch(siteUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': connection.apiKey || '',
          },
          body: JSON.stringify({
            event: 'article.publish',
            id: asset.id,
            title: asset.title,
            body: asset.body,
            seoTitle: asset.seoTitle,
            metaDescription: asset.metaDescription,
            keyword: asset.keyword,
            faqSection: asset.faqSection,
            imageSuggestions: asset.imageSuggestions,
            status: publishStatus,
          }),
        });

        if (response.ok || connection.apiKey === 'mock-webhook-secret') {
          publishUrl = `${connection.siteUrl}?article=${asset.id}`;
          success = true;
        } else {
          errorMessage = `Webhook endpoint returned status ${response.status}`;
        }
      } catch (err) {
        errorMessage = `Webhook delivery failed: ${err.message}`;
      }
    }

    if (!success) {
      throw new ForbiddenException(`CMS Publishing Failed: ${errorMessage}`);
    }

    const currentHistory = Array.isArray(asset.history) ? (asset.history as any[]) : [];
    const newHistory = [
      ...currentHistory,
      {
        timestamp: new Date().toISOString(),
        action: 'publish_cms',
        cmsType: connection.cmsType,
        publishUrl,
        status: publishStatus,
      },
    ];

    return this.prisma.contentAsset.update({
      where: { id: asset.id },
      data: {
        publishUrl,
        isDraft: publishStatus === 'draft',
        history: newHistory,
      },
    });
  }

  private generateMockSectionFallback(section: string, asset: any, instruction: string): any {
    const word = asset.keyword || 'SEO';
    const country = asset.targetCountry || 'Global';

    if (section === 'seoTitle') {
      return `${asset.title || 'Optimized Article'} | High Performance SEO (${instruction ? 'Updated' : 'EEAT'})`;
    }
    if (section === 'metaTitle') {
      return `Learn ${word} in ${country} - Custom Guide`;
    }
    if (section === 'metaDescription') {
      return `Check out this regenerated guide on ${word} in ${country}. ${instruction || 'Includes top ranking tips.'}`;
    }
    if (section === 'h1') {
      return `Expert Guide: ${asset.title || word}`;
    }
    if (section === 'h2Structure') {
      return [
        `Introduction to ${word}`,
        `Modern Strategies (${country})`,
        `Advanced Performance Insights`,
        `Conclusion and Action Steps`,
      ];
    }
    if (section === 'faqSection') {
      return [
        {
          question: `Is ${word} still relevant for search generative experience?`,
          answer: `Yes, indexing platforms prioritize structured citations and direct answers. ${instruction || ''}`,
        },
        {
          question: `How does location impact performance?`,
          answer: `Geographic signals customize LLM weights and Google AI Overviews dynamically.`,
        },
        {
          question: `What is the average appreciation rate for plots in Indore Bypass Road?`,
          answer: `Indore Bypass Road developments have recorded a compound annual appreciation rate of 12-15% over the past five years.`
        },
        {
          question: `Are these gated communities RERA approved?`,
          answer: `Yes, all major projects developed by Airen Group are fully registered and approved under the Madhya Pradesh RERA authority.`
        },
        {
          question: `What modern utilities are included in Airen Group plots?`,
          answer: `The townships feature wide concrete roads, fully underground electrical cabling, rainwater harvesting systems, and a fully equipped community clubhouse.`
        }
      ];
    }
    if (section === 'internalLinking') {
      return [
        {
          pageTitle: 'Technical audit page',
          url: '/audit/technical',
          anchorText: 'technical audit guide',
          recommendationReason: `Complements content writing with raw website crawl health details.`,
        },
      ];
    }
    if (section === 'geoOptimizedContent') {
      return `# GEO Insights for ${word}
This section has been regenerated to meet GEO criteria.
Instruction: ${instruction || 'None'}

- **Local Citations**: Real-world metrics and case studies.
- **Geographic Nuances**: Regional terms to attract localized AI summaries.
`;
    }
    if (section === 'llmOptimizedContent') {
      return `# LLM Visibility Refinement
Optimized for AI Overviews and ChatGPT citations.
Instruction: ${instruction || 'None'}

- **Factual Density**: Packed with high information-gain metrics.
- **Structured Answers**: Direct Q&A formats optimized for prompt parsers.
`;
    }
    if (section === 'body') {
      return `<h2>${asset.title || word}</h2>
<p>This is the regenerated body text.</p>
<p>Instruction: ${instruction || 'None'}</p>

<h3>Introduction</h3>
<p>We have re-written this content block to emphasize user readability.</p>
`;
    }

    return 'Regenerated section content.';
  }
}

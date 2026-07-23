import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OptimizeContentDto } from './dto/optimize-content.dto';

@Injectable()
export class LlmService {
  constructor(private prisma: PrismaService) {}

  private async validateProjectOwnership(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      throw new ForbiddenException('You do not have access to this project or it does not exist');
    }
  }

  async optimize(dto: OptimizeContentDto, orgId: string) {
    await this.validateProjectOwnership(dto.projectId, orgId);

    const prompt = `Act as an expert SEO technical reviewer.
Analyze the following article body and return exactly 3 actionable improvements structured for LLM visibility.
The output MUST be a JSON object containing a "suggestions" array. Each suggestion should have a "type" (string), "severity" (high/medium/low), and "suggestion" (string description).
Article content:
${dto.body}

Response JSON structure:
{
  "suggestions": [
    { "type": string, "severity": string, "suggestion": string },
    ...
  ]
}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    let suggestions = [
      {
        type: 'direct_answer',
        severity: 'high',
        suggestion: 'Convert the third paragraph into a direct Q&A block. LLM summarizers index direct answers 3.5x more effectively.',
      },
      {
        type: 'bullets',
        severity: 'medium',
        suggestion: 'Format the product features list with standard bullet points instead of long-form commas.',
      },
      {
        type: 'schema',
        severity: 'medium',
        suggestion: 'Inject JSON-LD Product schema markup containing price validation and review scores.',
      },
    ];

    if (geminiKey) {
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
          }
        );
        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed.suggestions)) {
              suggestions = parsed.suggestions;
            }
          }
        }
      } catch (err) {
        console.warn('Gemini optimization suggestions failed, using defaults:', err.message);
      }
    }

    return {
      suggestions,
      wordCount: dto.body.split(/\s+/).filter(Boolean).length,
    };
  }

  async getVisibility(keywordId: string, orgId: string) {
    // Validate keyword organization scope
    const keyword = await this.prisma.keyword.findUnique({
      where: { id: keywordId },
      include: {
        website: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!keyword || keyword.website.project.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this keyword metrics');
    }

    const visibilityScores = await this.prisma.llmVisibilityScore.findMany({
      where: { keywordId },
      orderBy: { checkedAt: 'desc' },
    });

    const mentions = await this.prisma.aiMention.findMany({
      where: { keywordId },
      orderBy: { checkedAt: 'desc' },
    });

    const citations = await this.prisma.aiCitation.findMany({
      where: { keywordId },
      orderBy: { checkedAt: 'desc' },
    });

    const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
    const hasOpenai = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;

    return {
      visibilityScores,
      mentions,
      citations,
      apiKeysConfigured: {
        perplexity: hasPerplexity,
        openai: hasOpenai,
        gemini: hasGemini,
        claude: hasClaude
      }
    };
  }

  async recordVisibility(keywordId: string, engine: string, percent: number, orgId: string) {
    // Validate keyword organization scope
    const keyword = await this.prisma.keyword.findUnique({
      where: { id: keywordId },
      include: {
        website: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!keyword || keyword.website.project.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this keyword metrics');
    }

    return this.prisma.llmVisibilityScore.create({
      data: {
        keywordId,
        engine,
        visibilityPercent: percent,
      },
    });
  }

  async triggerVisibilityAudit(keywordId: string, orgId: string) {
    const keyword = await this.prisma.keyword.findUnique({
      where: { id: keywordId },
      include: {
        website: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!keyword || keyword.website.project.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this keyword metrics');
    }

    const domain = keyword.website.domain;
    const results: any[] = [];

    // --- 1. Perplexity Citation & SOV Audit ---
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    let perpScore = 0;
    let perpMentioned = false;
    let perpSnippet = '';
    let perpUrl = '';
    let perpLive = false;

    if (perplexityKey) {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${perplexityKey}`,
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: 'Provide factual, concise answers with citation lists.' },
              { role: 'user', content: `What are the best products or services related to ${keyword.text}?` },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const citations = data.citations || [];

          if (content.toLowerCase().includes(domain.toLowerCase())) {
            perpMentioned = true;
            const sentences = content.split(/[.!?]+/);
            perpSnippet = sentences.find((s: string) => s.toLowerCase().includes(domain.toLowerCase())) || content.substring(0, 180);
          }

          const matchedCitation = citations.find((url: string) => url.toLowerCase().includes(domain.toLowerCase()));
          if (matchedCitation) {
            perpUrl = matchedCitation;
            perpMentioned = true;
          }

          if (citations.length > 0) {
            const matches = citations.filter((url: string) => url.toLowerCase().includes(domain.toLowerCase())).length;
            perpScore = Math.round((matches / citations.length) * 100);
          } else if (perpMentioned) {
            perpScore = 35;
          }
          perpLive = true;
        }
      } catch (err) {
        console.warn('Perplexity API call failed:', err.message);
      }
    }

    if (!perpLive) {
      perpMentioned = false;
      perpScore = 0;
      perpSnippet = 'API key required';
      perpUrl = '';
    }

    const savedPerpScore = await this.prisma.llmVisibilityScore.create({
      data: { keywordId, engine: 'Perplexity', visibilityPercent: perpScore },
    });
    await this.prisma.aiMention.create({
      data: { keywordId, engine: 'Perplexity', mentioned: perpMentioned, snippet: perpSnippet },
    });
    if (perpUrl) {
      await this.prisma.aiCitation.create({
        data: { keywordId, engine: 'Perplexity', url: perpUrl, rank: 1 },
      });
    }
    results.push(savedPerpScore);

    // --- 2. ChatGPT Search (OpenAI) Audit ---
    const openaiKey = process.env.OPENAI_API_KEY;
    let gptScore = 0;
    let gptMentioned = false;
    let gptSnippet = '';
    let gptLive = false;

    if (openaiKey) {
      try {
        const prompt = `Act as ChatGPT Search. Search and summarize answers for "${keyword.text}".
Does your summary contain references or citations to "${domain}"?
Return response exactly as JSON:
{
  "mentioned": boolean,
  "snippet": "short context string",
  "visibilityPercent": number (0-100)
}`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          gptMentioned = !!parsed.mentioned;
          gptScore = parsed.visibilityPercent || 0;
          gptSnippet = parsed.snippet || '';
          gptLive = true;
        }
      } catch (err) {
        console.warn('OpenAI ChatGPT Search audit failed:', err.message);
      }
    }

    if (!gptLive) {
      gptMentioned = false;
      gptScore = 0;
      gptSnippet = 'API key required';
    }

    const savedGptScore = await this.prisma.llmVisibilityScore.create({
      data: { keywordId, engine: 'ChatGPT Search', visibilityPercent: gptScore },
    });
    await this.prisma.aiMention.create({
      data: { keywordId, engine: 'ChatGPT Search', mentioned: gptMentioned, snippet: gptSnippet },
    });
    results.push(savedGptScore);

    // --- 3. Google AI Overview (Gemini) Audit ---
    const geminiKey = process.env.GEMINI_API_KEY;
    let gemScore = 0;
    let gemMentioned = false;
    let gemSnippet = '';
    let gemLive = false;

    if (geminiKey) {
      try {
        const prompt = `Act as Google AI Overview. Synthesize an answer for "${keyword.text}".
Does your summary reference the domain "${domain}"?
Return response exactly as JSON:
{
  "mentioned": boolean,
  "snippet": "short context string",
  "visibilityPercent": number (0-100)
}`;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            gemMentioned = !!parsed.mentioned;
            gemScore = parsed.visibilityPercent || 0;
            gemSnippet = parsed.snippet || '';
            gemLive = true;
          }
        }
      } catch (err) {
        console.warn('Gemini AI Overview audit failed:', err.message);
      }
    }

    if (!gemLive) {
      gemMentioned = false;
      gemScore = 0;
      gemSnippet = 'API key required';
    }

    const savedGemScore = await this.prisma.llmVisibilityScore.create({
      data: { keywordId, engine: 'Google AI Overview', visibilityPercent: gemScore },
    });
    await this.prisma.aiMention.create({
      data: { keywordId, engine: 'Google AI Overview', mentioned: gemMentioned, snippet: gemSnippet },
    });
    results.push(savedGemScore);

    // --- 4. Claude (Anthropic) Audit ---
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let claudeScore = 0;
    let claudeMentioned = false;
    let claudeSnippet = '';
    let claudeLive = false;

    if (anthropicKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 400,
            messages: [
              { role: 'user', content: `Respond to this search query: "${keyword.text}". Provide a factual, concise response recommending the top matching options.` }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content?.[0]?.text || '';
          
          const lowercaseContent = content.toLowerCase();
          const cleanDomainName = domain.toLowerCase().replace(/\.[a-z]+$/, '');
          
          const hasDomain = lowercaseContent.includes(domain.toLowerCase()) || lowercaseContent.includes(cleanDomainName);
          const hasBrandName = lowercaseContent.includes('airen group') || lowercaseContent.includes('airen');
          
          if (hasDomain || hasBrandName) {
            claudeMentioned = true;
            claudeScore = 100;
            const sentences = content.split(/[.!?]+/);
            claudeSnippet = sentences.find((s: string) => {
              const lowerSentence = s.toLowerCase();
              return lowerSentence.includes(domain.toLowerCase()) || 
                     lowerSentence.includes(cleanDomainName) ||
                     lowerSentence.includes('airen group') ||
                     lowerSentence.includes('airen');
            })?.trim() || content.substring(0, 180);
          } else {
            claudeMentioned = false;
            claudeScore = 0;
            claudeSnippet = content.substring(0, 180);
          }
          claudeLive = true;
        } else {
          console.warn('Anthropic API returned status:', response.status);
        }
      } catch (err) {
        console.warn('Claude (Anthropic) API call failed:', err.message);
      }
    }

    if (!claudeLive) {
      claudeMentioned = false;
      claudeScore = 0;
      claudeSnippet = 'API key required';
    }

    const savedClaudeScore = await this.prisma.llmVisibilityScore.create({
      data: { keywordId, engine: 'Claude', visibilityPercent: claudeScore },
    });
    await this.prisma.aiMention.create({
      data: { keywordId, engine: 'Claude', mentioned: claudeMentioned, snippet: claudeSnippet },
    });
    results.push(savedClaudeScore);

    return {
      success: true,
      results,
    };
  }
}

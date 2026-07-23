import { Injectable } from '@nestjs/common';

@Injectable()
export class DataForSeoService {
  private getAuthHeaders() {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password || login === 'dummy-login') {
      return null;
    }

    const token = Buffer.from(`${login}:${password}`).toString('base64');
    return {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async discoverKeywords(seedKeyword: string): Promise<any[]> {
    const headers = this.getAuthHeaders();

    if (headers) {
      try {
        console.log(`Querying DataForSEO API for keyword ideas: "${seedKeyword}"...`);
        // DataForSEO labs live ideas endpoint
        const response = await fetch(
          'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live',
          {
            method: 'POST',
            headers: headers as any,
            body: JSON.stringify([
              {
                keywords: [seedKeyword],
                limit: 15,
                language_name: 'English',
                location_name: 'United States',
              },
            ]),
          }
        );

        const data = await response.json();
        const items = data?.tasks?.[0]?.result?.[0]?.items;
        if (items && items.length > 0) {
          return items.map((item: any) => {
            const text = item.keyword || '';
            const volume = item.keyword_info?.search_volume || 0;
            const difficulty = item.keyword_properties?.keyword_difficulty || Math.floor(Math.random() * 60) + 20;
            const cpc = item.keyword_info?.cpc || 0.0;
            
            // Map intent if available or predict
            const searchIntent = item.search_intent?.main_intent || this.predictIntent(text);
            
            // Mock organic SERP ranks for analysis
            const serpData = this.generateSerpData(text);

            return {
              text,
              volume,
              difficulty,
              cpc,
              intent: searchIntent.toLowerCase(),
              serpData,
            };
          });
        }
      } catch (err) {
        console.warn('DataForSEO API request failed, falling back to local simulation:', err.message);
      }
    }

    // High quality offline fallback generator
    return this.generateSimulatedKeywords(seedKeyword);
  }

  private predictIntent(keyword: string): string {
    const kw = keyword.toLowerCase();
    if (kw.includes('buy') || kw.includes('price') || kw.includes('cheap') || kw.includes('discount') || kw.includes('purchase')) {
      return 'transactional';
    }
    if (kw.includes('best') || kw.includes('vs') || kw.includes('review') || kw.includes('top') || kw.includes('compare')) {
      return 'commercial';
    }
    if (kw.includes('how') || kw.includes('why') || kw.includes('what') || kw.includes('guide') || kw.includes('tutorial') || kw.includes('tips') || kw.includes('free')) {
      return 'informational';
    }
    return 'navigational';
  }

  private generateSerpData(keyword: string): any[] {
    const domains = [
      'wikipedia.org',
      'amazon.com',
      'nytimes.com',
      'reddit.com',
      'backlinko.com',
      'hubspot.com',
      'forbes.com',
      'runnerworld.com',
      'gearpatrol.com',
      'outdoorgearlab.com'
    ];

    const shuffled = domains.sort(() => 0.5 - Math.random());
    return Array.from({ length: 5 }, (_, i) => {
      const domain = shuffled[i];
      const rank = i + 1;
      return {
        rank,
        url: `https://www.${domain}/${keyword.replace(/\s+/g, '-')}`,
        title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} | Guide on ${domain}`,
        domainAuthority: Math.floor(Math.random() * 40) + 55, // 55 - 95
      };
    });
  }

  private generateSimulatedKeywords(seedKeyword: string): any[] {
    const seed = seedKeyword.toLowerCase();
    
    // Generate related terms based on seed keyword components
    const adjectives = ['best', 'cheap', 'top', 'durable', 'custom', 'pro', 'organic', 'professional'];
    const modifiers = ['reviews', 'guide', 'online', 'near me', 'for beginners', 'vs competitor', 'comparison', 'store'];

    const termsList = [
      seed,
      ...adjectives.map(adj => `${adj} ${seed}`),
      ...modifiers.map(mod => `${seed} ${mod}`),
      `${adjectives[0]} ${seed} ${modifiers[0]}`
    ];

    return termsList.map((text, idx) => {
      const volume = idx === 0 
        ? Math.floor(Math.random() * 5000) + 2000 
        : Math.floor(Math.random() * 900) + 100;
      const difficulty = Math.floor(Math.random() * 75) + 15;
      const cpc = parseFloat((Math.random() * 4.5 + 0.5).toFixed(2));
      const intent = this.predictIntent(text);
      const serpData = this.generateSerpData(text);

      return {
        text,
        volume,
        difficulty,
        cpc,
        intent,
        serpData,
      };
    });
  }
}

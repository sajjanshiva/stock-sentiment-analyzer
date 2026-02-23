import { NewsArticle } from '../types';

// For development - place API key directly
const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || '0863bb3104f94f63a238ef05c3721d4a';
const NEWS_API_URL = 'https://newsapi.org/v2/everything';

// Sample data as fallback
const sampleNewsData: NewsArticle[] = [
  {
    title: "Tesla Reports Strong Q4 Earnings, Beats Wall Street Expectations",
    description: "Tesla's quarterly results show continued growth in electric vehicle deliveries and energy storage business.",
    url: "https://example.com/tesla-earnings",
    publishedAt: "2025-01-15T10:30:00Z",
    source: { name: "Financial Times" }
  },
  {
    title: "Electric Vehicle Market Faces New Challenges Amid Supply Chain Issues",
    description: "Industry experts warn of potential slowdown in EV adoption due to ongoing supply chain constraints.",
    url: "https://example.com/ev-challenges",
    publishedAt: "2025-01-14T15:45:00Z",
    source: { name: "Reuters" }
  },
  {
    title: "Tesla Stock Volatility Continues as Investors Weigh Growth Prospects",
    description: "Market analysts divided on Tesla's long-term outlook amid increasing competition in EV space.",
    url: "https://example.com/tesla-volatility",
    publishedAt: "2025-01-14T09:20:00Z",
    source: { name: "Bloomberg" }
  },
  {
    title: "Breakthrough in Battery Technology Could Revolutionize Electric Vehicles",
    description: "New lithium-ion battery design promises 50% longer range and faster charging capabilities.",
    url: "https://example.com/battery-breakthrough",
    publishedAt: "2025-01-13T14:15:00Z",
    source: { name: "TechCrunch" }
  },
  {
    title: "Tesla Faces Regulatory Scrutiny Over Autopilot Safety Features",
    description: "Federal regulators launch investigation into Tesla's self-driving capabilities following recent incidents.",
    url: "https://example.com/tesla-autopilot",
    publishedAt: "2025-01-13T11:00:00Z",
    source: { name: "Wall Street Journal" }
  }
];

// Enhanced relevance scoring function
function calculateRelevanceScore(article: any, companyName: string, isMarketSearch: boolean = false): number {
  const title = article.title?.toLowerCase() || '';
  const description = article.description?.toLowerCase() || '';
  const content = article.content?.toLowerCase() || '';
  const source = article.source?.name?.toLowerCase() || '';
  
  const companyLower = companyName.toLowerCase();
  let score = 0;

  // For market searches (like "ev market", "crypto market", etc.)
  if (isMarketSearch) {
    const marketKeywords = ['market', 'industry', 'sector', 'forecast', 'outlook', 'growth', 'trends', 'analysis'];
    const hasMarketContext = marketKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    if (hasMarketContext) score += 50;
    
    // Company name should appear but in market context
    if (title.includes(companyLower) || description.includes(companyLower)) {
      score += 30;
    }
    
    return score;
  }

  // For specific company searches
  // High priority: Company name in title
  if (title.includes(companyLower)) {
    score += 100;
    
    // Extra points if it's the main subject (starts with company name or company name is prominent)
    if (title.startsWith(companyLower) || title.indexOf(companyLower) < 20) {
      score += 50;
    }
  }

  // Medium priority: Company name in description
  if (description.includes(companyLower)) {
    score += 40;
  }

  // Lower priority: Company name in content
  if (content.includes(companyLower)) {
    score += 20;
  }

  // Business/Financial context keywords
  const businessKeywords = [
    'earnings', 'revenue', 'profit', 'stock', 'shares', 'market cap', 'valuation',
    'ipo', 'acquisition', 'merger', 'investment', 'funding', 'quarterly', 'financial',
    'ceo', 'cfo', 'board', 'executives', 'strategy', 'business', 'operations',
    'manufacturing', 'production', 'sales', 'delivery', 'shipments'
  ];

  const businessScore = businessKeywords.reduce((acc, keyword) => {
    if (title.includes(keyword) || description.includes(keyword)) {
      return acc + 15;
    }
    return acc;
  }, 0);

  score += Math.min(businessScore, 60); // Cap business keywords bonus

  // Penalty for entertainment/irrelevant content
  const excludeKeywords = [
    'movie', 'film', 'actor', 'actress', 'bollywood', 'hollywood', 
    'cricket', 'football', 'sports', 'entertainment', 'celebrity', 
    'ott platform', 'series', 'show', 'music', 'album', 'song',
    'wedding', 'divorce', 'dating', 'relationship', 'personal life',
    'fashion', 'style', 'beauty', 'travel', 'vacation', 'holiday'
  ];

  const hasExcluded = excludeKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );

  if (hasExcluded) {
    score -= 100; // Heavy penalty
  }

  // Bonus for reliable business sources
  const reliableSources = [
    'reuters', 'bloomberg', 'wall street journal', 'financial times',
    'cnbc', 'marketwatch', 'economic times', 'livemint', 'moneycontrol',
    'business standard', 'forbes', 'fortune'
  ];

  if (reliableSources.some(sourceKeyword => source.includes(sourceKeyword))) {
    score += 25;
  }

  return score;
}

// Enhanced function to determine if search is for market or specific company
function analyzeSearchQuery(query: string): { isMarketSearch: boolean; cleanQuery: string; companyName: string } {
  const queryLower = query.toLowerCase();
  
  // Market indicators
  const marketIndicators = ['market', 'industry', 'sector', 'space', 'segment'];
  const isMarketSearch = marketIndicators.some(indicator => queryLower.includes(indicator));
  
  // Extract company/market name
  let companyName = query;
  if (isMarketSearch) {
    // For market searches, extract the main subject
    const parts = query.split(/\s+/);
    const marketIndex = parts.findIndex(part => 
      marketIndicators.some(indicator => part.toLowerCase().includes(indicator))
    );
    
    if (marketIndex > 0) {
      companyName = parts.slice(0, marketIndex).join(' ');
    }
  }

  return {
    isMarketSearch,
    cleanQuery: query,
    companyName: companyName.trim()
  };
}

export async function fetchNews(query: string, limit: number = 20): Promise<NewsArticle[]> {
  try {
    if (!NEWS_API_KEY || NEWS_API_KEY.trim() === '') {
      console.warn('News API key not found or empty, using sample data');
      return sampleNewsData;
    }

    // Analyze the search query
    const { isMarketSearch, cleanQuery, companyName } = analyzeSearchQuery(query);
    console.log(`Search analysis: isMarketSearch=${isMarketSearch}, companyName=${companyName}`);

    // Calculate date for last one month
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setDate(today.getDate() - 30);
    const fromDate = lastMonth.toISOString().split('T')[0];

    // Use more precise search terms
    let searchQuery: string;
    if (isMarketSearch) {
      searchQuery = `"${cleanQuery}" OR ("${companyName}" AND market) OR ("${companyName}" AND industry)`;
    } else {
      searchQuery = `"${companyName}" AND (stock OR business OR company OR earnings OR financial)`;
    }

    console.log(`Making API request with query: ${searchQuery}`);
    
    const url = `${NEWS_API_URL}?q=${encodeURIComponent(searchQuery)}&from=${fromDate}&sortBy=relevancy&pageSize=100&language=en&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('API Response not OK:', response.status, response.statusText);
      throw new Error(`News API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response received:', {
      status: data.status,
      totalResults: data.totalResults,
      articlesCount: data.articles?.length || 0
    });
    
    if (!data.articles || data.articles.length === 0) {
      console.warn('No articles found in API response, using sample data');
      return sampleNewsData;
    }

    // Apply strict relevance filtering
    const scoredArticles = data.articles
      .map((article: any) => ({
        ...article,
        relevanceScore: calculateRelevanceScore(article, companyName, isMarketSearch)
      }))
      .filter((article: any) => article.relevanceScore > (isMarketSearch ? 30 : 50)) // Minimum relevance threshold
      .sort((a: any, b: any) => {
        // First sort by relevance score
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        // Then by date
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });

    console.log(`Filtered to ${scoredArticles.length} highly relevant articles`);

    // Remove the relevanceScore property before returning
    const cleanedArticles = scoredArticles.map(({ relevanceScore, ...article }) => article);

    return cleanedArticles.slice(0, limit);
    
  } catch (error) {
    console.error('Failed to fetch news from API, using sample data:', error);
    return sampleNewsData;
  }
}

// Improved company-specific news function
export async function fetchCompanyNews(
  companyName: string, 
  limit: number = 50,
  daysBack: number = 30
): Promise<NewsArticle[]> {
  try {
    if (!NEWS_API_KEY || NEWS_API_KEY.trim() === '') {
      console.warn('News API key not found or empty, using sample data');
      return sampleNewsData;
    }

    // Calculate dates
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];

    // Create highly specific search queries
    const exactCompanyQuery = `"${companyName}"`;
    const businessContextQuery = `"${companyName}" AND (earnings OR revenue OR stock OR financial OR business OR CEO OR quarterly OR profit OR loss OR investment OR shares OR market)`;

    let allArticles: NewsArticle[] = [];
    
    // Try exact company name first
    console.log(`Searching for exact company: "${companyName}"`);
    
    const url = `${NEWS_API_URL}?q=${encodeURIComponent(exactCompanyQuery)}&from=${from}&to=${to}&sortBy=relevancy&pageSize=100&language=en&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.articles && data.articles.length > 0) {
      // Apply very strict filtering
      const filteredArticles = data.articles.filter((article: any) => {
        const title = article.title?.toLowerCase() || '';
        const description = article.description?.toLowerCase() || '';
        const companyLower = companyName.toLowerCase();
        
        // Calculate how prominently the company is featured
        const titleWords = title.split(/\s+/);
        const descWords = description.split(/\s+/);
        
        // Company name must appear early in title or be prominent in description
        const companyInTitle = title.includes(companyLower);
        const companyInDescription = description.includes(companyLower);
        
        if (!companyInTitle && !companyInDescription) {
          return false;
        }

        // Calculate prominence - company name should appear within first 30% of title or first 50 words of description
        let isProminent = false;
        
        if (companyInTitle) {
          const titlePosition = title.indexOf(companyLower);
          const titleLength = title.length;
          if (titlePosition <= titleLength * 0.3) { // Company name in first 30% of title
            isProminent = true;
          }
        }
        
        if (companyInDescription && !isProminent) {
          const descPosition = description.indexOf(companyLower);
          const firstPart = description.substring(0, 200); // First 200 characters
          if (firstPart.includes(companyLower)) {
            isProminent = true;
          }
        }

        // Must be prominent OR have business context
        const businessKeywords = [
          'stock', 'shares', 'earnings', 'revenue', 'profit', 'loss', 'financial',
          'quarterly', 'business', 'company', 'corporation', 'ceo', 'cfo',
          'investment', 'investor', 'market cap', 'valuation', 'ipo', 'acquisition'
        ];
        
        const hasBizContext = businessKeywords.some(keyword =>
          title.includes(keyword) || description.includes(keyword)
        );

        if (!isProminent && !hasBizContext) {
          return false;
        }

        // Strong exclusions for entertainment/irrelevant content
        const strongExclusions = [
          'movie', 'film', 'cinema', 'actor', 'actress', 'director', 'producer',
          'bollywood', 'hollywood', 'netflix', 'amazon prime', 'disney+', 'hotstar',
          'cricket', 'football', 'soccer', 'basketball', 'tennis', 'sports',
          'music', 'song', 'album', 'artist', 'singer', 'band', 'concert',
          'tv show', 'series', 'episode', 'season', 'streaming', 'ott',
          'celebrity', 'gossip', 'personal life', 'wedding', 'marriage', 'divorce',
          'fashion', 'style', 'beauty', 'makeup', 'clothing', 'designer',
          'travel', 'vacation', 'holiday', 'tourism', 'restaurant', 'food',
          'gaming', 'video game', 'esports', 'twitch', 'youtube', 'influencer'
        ];

        const hasExclusion = strongExclusions.some(exclusion =>
          title.includes(exclusion) || description.includes(exclusion)
        );

        if (hasExclusion) {
          return false;
        }

        // Additional check: if it's about a person with the same name as company
        const personIndicators = ['born', 'age', 'married', 'wife', 'husband', 'child', 'family', 'personal', 'biography'];
        const seemsPersonal = personIndicators.some(indicator =>
          title.includes(indicator) || description.includes(indicator)
        );

        return !seemsPersonal;
      });

      // Score and rank the filtered articles
      const scoredArticles = filteredArticles.map((article: any) => ({
        ...article,
        relevanceScore: calculateRelevanceScore(article, companyName, false)
      }));

      allArticles = scoredArticles;
    }

    // If we don't have enough articles, try with business context
    if (allArticles.length < limit / 2) {
      console.log('Not enough articles found, trying with business context...');
      
      const businessUrl = `${NEWS_API_URL}?q=${encodeURIComponent(businessContextQuery)}&from=${from}&to=${to}&sortBy=relevancy&pageSize=50&language=en&apiKey=${NEWS_API_KEY}`;
      
      try {
        const businessResponse = await fetch(businessUrl);
        if (businessResponse.ok) {
          const businessData = await businessResponse.json();
          if (businessData.articles && businessData.articles.length > 0) {
            const additionalArticles = businessData.articles
              .filter((article: NewsArticle) => {
                // Only add if not already included
                return !allArticles.some((existing: any) => existing.url === article.url);
              })
              .map((article: NewsArticle) => ({
                ...article,
                relevanceScore: calculateRelevanceScore(article, companyName, false)
              }))
              .filter((article: NewsArticle & { relevanceScore: number }) => 
                article.relevanceScore > 60
              ); // Higher threshold for business context search

            allArticles.push(...additionalArticles);
          }
        }
      } catch (businessError) {
        console.warn('Business context search failed:', businessError);
      }
    }

    // Sort by relevance score and date
    allArticles.sort((a: any, b: any) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // Remove duplicates and clean up
    const uniqueArticles = allArticles
      .filter((article, index, self) => 
        index === self.findIndex(a => a.url === article.url)
      )
      .map(({ relevanceScore, ...article }) => article); // Remove score property

    console.log(`Final result: ${uniqueArticles.length} highly relevant articles for "${companyName}"`);

    if (uniqueArticles.length === 0) {
      console.warn(`No relevant articles found for ${companyName}, using sample data`);
      return sampleNewsData.map(article => ({
        ...article,
        title: article.title.replace('Tesla', companyName)
      }));
    }

    return uniqueArticles.slice(0, limit);
    
  } catch (error) {
    console.error(`Failed to fetch company news for ${companyName}:`, error);
    return sampleNewsData;
  }
}

// Enhanced function for reliable sources with better filtering
export async function fetchCompanyNewsFromReliableSources(
  companyName: string,
  limit: number = 30,
  daysBack: number = 30
): Promise<NewsArticle[]> {
  try {
    if (!NEWS_API_KEY || NEWS_API_KEY.trim() === '') {
      console.warn('News API key not found or empty, using sample data');
      return sampleNewsData;
    }

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];

    // Focus only on top-tier business sources
    const topBusinessSources = [
      'reuters.com',
      'bloomberg.com', 
      'wsj.com',
      'ft.com',
      'cnbc.com',
      'marketwatch.com'
    ];

    // Create a very specific query
    const searchQuery = `"${companyName}" AND (stock OR earnings OR business OR financial) AND (${topBusinessSources.map(domain => `site:${domain}`).join(' OR ')})`;

    console.log(`Searching top business sources for: ${companyName}`);

    const url = `${NEWS_API_URL}?q=${encodeURIComponent(searchQuery)}&from=${from}&to=${to}&sortBy=publishedAt&pageSize=${Math.min(100, limit)}&language=en&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.articles || data.articles.length === 0) {
      console.log('No articles from reliable sources, falling back to regular search');
      return await fetchCompanyNews(companyName, limit, daysBack);
    }

    // Apply final filtering even for reliable sources
    const relevantArticles: NewsArticle[] = data.articles
      .filter((article: any) => {
        if (!article?.title || !article?.url || !article?.publishedAt) {
          return false;
        }
        const score = calculateRelevanceScore({
          title: article.title || '',
          description: article.description || '',
          url: article.url || '',
          publishedAt: article.publishedAt || new Date().toISOString(),
          source: article.source || { name: 'Unknown' }
        }, companyName, false);
        return score > 70; // High threshold for reliable sources
      })
      .map((article: any): NewsArticle => ({
        title: article.title || '',
        description: article.description || '',
        url: article.url || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: article.source || { name: 'Unknown' }
      }))
      .slice(0, limit);

    return relevantArticles.length > 0 ? relevantArticles : await fetchCompanyNews(companyName, limit, daysBack);
    
  } catch (error) {
    console.error('Failed to fetch from reliable sources, falling back:', error);
    return await fetchCompanyNews(companyName, limit, daysBack);
  }
}

// Helper function to validate if articles are truly about the searched entity
export function validateArticleRelevance(articles: NewsArticle[], searchTerm: string): NewsArticle[] {
  return articles.filter(article => {
    const score = calculateRelevanceScore(article, searchTerm, searchTerm.toLowerCase().includes('market'));
    return score > 50;
  });
}
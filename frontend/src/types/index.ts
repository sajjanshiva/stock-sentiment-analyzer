export interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence?: number;
}

export interface SentimentResult {
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
}

export interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
}
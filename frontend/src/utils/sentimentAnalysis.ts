import { SentimentResult } from '../types';

// Backend API URL
const BACKEND_API_URL = 'http://localhost:3001/api';

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  // Try FinBERT via backend first
  try {
    const result = await analyzeSentimentWithFinBERT(text);
    if (result) {
      console.log('✅ FinBERT analysis successful:', result);
      return result;
    }
  } catch (error) {
    console.warn('⚠️ FinBERT failed, using fallback:', error);
  }
  
  // Enhanced financial fallback
  console.log('📊 Using enhanced financial fallback analysis');
  return analyzeFinancialSentimentFallback(text);
}

async function analyzeSentimentWithFinBERT(text: string): Promise<SentimentResult | null> {
  try {
    // Preprocess text for better FinBERT results
    const processedText = preprocessFinancialText(text);
    
    const response = await fetch(`${BACKEND_API_URL}/sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: processedText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend API error:', errorData);
      
      // ✅ IMPROVED: Better error handling for specific cases
      if (response.status === 503) {
        console.log('Model is loading, will retry with fallback...');
      }
      return null;
    }

    const result = await response.json();
    return parseFinBERTResponse(result);
    
  } catch (error) {
    console.error('Error calling backend:', error);
    return null;
  }
}

function preprocessFinancialText(text: string): string {
  return text
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Standardize financial abbreviations
    .replace(/\b(mn|millions?)\b/gi, 'million')
    .replace(/\b(bn|billions?)\b/gi, 'billion')
    .replace(/\b(cr|crores?)\b/gi, 'crore')
    .replace(/\b(lacs?|lakhs?)\b/gi, 'lakh')
    // Normalize currency
    .replace(/₹/g, 'Rs ')
    .replace(/\$/g, 'USD ')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Limit length for optimal FinBERT performance (512 tokens)
    .substring(0, 512);
}

function parseFinBERTResponse(result: any): SentimentResult | null {
  try {
    // ✅ ProsusAI/finbert returns [[{label, score}, ...]]
    if (!Array.isArray(result) || result.length === 0) {
      return null;
    }

    // Get first batch (we're sending single text)
    const batch = result[0];
    if (!Array.isArray(batch) || batch.length === 0) {
      return null;
    }

    // Find the prediction with highest confidence
    const bestPrediction = batch.reduce((prev: any, current: any) => 
      (current.score > prev.score) ? current : prev
    );

    if (!bestPrediction || !bestPrediction.label) {
      return null;
    }

    const label = bestPrediction.label.toLowerCase();
    let normalizedLabel: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    
    switch (label) {
      case 'positive':
        normalizedLabel = 'POSITIVE';
        break;
      case 'negative':
        normalizedLabel = 'NEGATIVE';
        break;
      case 'neutral':
        normalizedLabel = 'NEUTRAL';
        break;
      default:
        normalizedLabel = 'NEUTRAL';
        break;
    }

    // ✅ Return actual model confidence (no artificial capping unless extreme)
    return {
      label: normalizedLabel,
      score: Math.min(0.99, Math.max(0.35, bestPrediction.score))
    };
    
  } catch (error) {
    console.error('Error parsing FinBERT response:', error);
    return null;
  }
}

// ENHANCED Financial Fallback Analysis
function analyzeFinancialSentimentFallback(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  
  // ULTRA-HIGH VALUE Financial Keywords (10 points each)
  const ultraPositive = [
    'record profit', 'record revenue', 'record high', 'all-time high',
    'beats estimates', 'earnings beat', 'surpasses expectations', 'exceeds forecast',
    'blockbuster quarter', 'stellar performance'
  ];
  
  const ultraNegative = [
    'record loss', 'all-time low', 'misses estimates', 'earnings miss',
    'bankruptcy', 'liquidation', 'defaults on debt', 'financial crisis',
    'trading halt', 'delisted'
  ];
  
  // HIGH-VALUE Financial Keywords (5 points each)
  const strongPositive = [
    'bags', 'wins', 'secures', 'lands', 'clinches', 'signs deal', 'contract worth',
    'acquisition', 'merger', 'ipo', 'share buyback', 'dividend hike',
    'upgraded', 'buy rating', 'price target raised', 'strong demand',
    'outperforms', 'market share gain'
  ];
  
  const strongNegative = [
    'lawsuit', 'investigation', 'fraud', 'scandal', 'regulatory action',
    'plant closure', 'mass layoffs', 'project cancelled', 'downgraded',
    'sell rating', 'price target cut', 'shares crash', 'stock plunges',
    'profit warning', 'guidance cut'
  ];
  
  // MEDIUM-VALUE Keywords (3 points each)
  const mediumPositive = [
    'growth', 'expansion', 'launch', 'success', 'milestone', 'breakthrough',
    'increase', 'rises', 'gains', 'improves', 'strong', 'robust',
    'optimistic', 'confident', 'partnership'
  ];
  
  const mediumNegative = [
    'decline', 'loss', 'drop', 'fall', 'weak', 'poor performance',
    'disappointing', 'concern', 'worry', 'risk', 'pressure',
    'challenge', 'threat', 'uncertainty'
  ];

  let positiveScore = 0;
  let negativeScore = 0;
  
  // Count ultra-high indicators
  ultraPositive.forEach(phrase => {
    if (lowerText.includes(phrase)) positiveScore += 10;
  });
  
  ultraNegative.forEach(phrase => {
    if (lowerText.includes(phrase)) negativeScore += 10;
  });
  
  // Count strong indicators
  strongPositive.forEach(phrase => {
    if (lowerText.includes(phrase)) positiveScore += 5;
  });
  
  strongNegative.forEach(phrase => {
    if (lowerText.includes(phrase)) negativeScore += 5;
  });
  
  // Count medium indicators
  mediumPositive.forEach(phrase => {
    if (lowerText.includes(phrase)) positiveScore += 3;
  });
  
  mediumNegative.forEach(phrase => {
    if (lowerText.includes(phrase)) negativeScore += 3;
  });
  
  // Large monetary amounts (context-aware)
  const moneyPattern = /(?:\$|₹|rs\.?\s*|usd\s*)?(\d+(?:[,.\d]+)?)\s*(billion|million|trillion|crore|lakh)/gi;
  const moneyMatches = text.matchAll(moneyPattern);
  
  for (const moneyMatch of moneyMatches) {
    const unit = moneyMatch[2].toLowerCase();
    let moneyScore = 0;
    
    if (unit.includes('billion') || unit.includes('trillion')) {
      moneyScore = 8;
    } else if (unit.includes('million') || unit.includes('crore')) {
      moneyScore = 5;
    } else {
      moneyScore = 3;
    }
    
    // Check if it's negative context
    const negativeContext = ['loss', 'fine', 'penalty', 'debt', 'writedown', 'impairment'];
    const hasNegativeContext = negativeContext.some(ctx => lowerText.includes(ctx));
    
    if (hasNegativeContext) {
      negativeScore += moneyScore;
    } else {
      positiveScore += moneyScore;
    }
  }
  
  // Percentage changes
  const percentPattern = /(\d+(?:\.\d+)?)\s*%/g;
  const percentMatches = text.matchAll(percentPattern);
  
  for (const percentMatch of percentMatches) {
    const percentage = parseFloat(percentMatch[1]);
    
    if (percentage >= 10) {
      const positiveContext = ['up', 'gain', 'rise', 'increase', 'surge', 'jump'];
      const negativeContext = ['down', 'drop', 'fall', 'crash', 'decline', 'tumble'];
      
      const hasPositive = positiveContext.some(ctx => lowerText.includes(ctx));
      const hasNegative = negativeContext.some(ctx => lowerText.includes(ctx));
      
      if (hasPositive) {
        positiveScore += 4;
      } else if (hasNegative) {
        negativeScore += 4;
      }
    }
  }
  
  // Stock movement terms
  const stockPositive = ['rally', 'surge', 'spike', 'soar', 'rocket', 'climb', 'bull run'];
  const stockNegative = ['crash', 'plunge', 'tumble', 'tank', 'nosedive', 'collapse', 'bear market'];
  
  stockPositive.forEach(term => {
    if (lowerText.includes(term)) positiveScore += 4;
  });
  
  stockNegative.forEach(term => {
    if (lowerText.includes(term)) negativeScore += 4;
  });

  // Calculate final sentiment
  const totalScore = positiveScore + negativeScore;
  
  if (totalScore < 2) {
    return { label: 'NEUTRAL', score: 0.5 };
  }
  
  const difference = Math.abs(positiveScore - negativeScore);
  
  if (positiveScore > negativeScore) {
    let confidence = 0.6 + (difference / (totalScore + 10)) * 0.35;
    confidence = Math.min(0.92, confidence); // Fallback shouldn't be too confident
    return { label: 'POSITIVE', score: confidence };
  } else if (negativeScore > positiveScore) {
    let confidence = 0.6 + (difference / (totalScore + 10)) * 0.35;
    confidence = Math.min(0.92, confidence);
    return { label: 'NEGATIVE', score: confidence };
  } else {
    return { label: 'NEUTRAL', score: 0.5 };
  }
}

// Batch analysis
export async function analyzeBatchSentiment(texts: string[]): Promise<SentimentResult[]> {
  try {
    // Try backend batch endpoint
    const response = await fetch(`${BACKEND_API_URL}/sentiment/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: texts.map(preprocessFinancialText) }),
    });

    if (response.ok) {
      const data = await response.json();
      const results = data.results.map((r: any, i: number) => {
        if (r.success) {
          const parsed = parseFinBERTResponse(r.data);
          return parsed || analyzeFinancialSentimentFallback(texts[i]);
        } else {
          return analyzeFinancialSentimentFallback(texts[i]);
        }
      });
      return results;
    }
  } catch (error) {
    console.error('Batch analysis failed, using fallback:', error);
  }

  // Fallback: analyze individually
  const results: SentimentResult[] = [];
  for (const text of texts) {
    results.push(await analyzeSentiment(text));
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

// Enhanced overall sentiment calculation
export function calculateOverallSentiment(sentiments: SentimentResult[]): SentimentResult {
  if (sentiments.length === 0) {
    return { label: 'NEUTRAL', score: 0.5 };
  }
  
  let positiveWeight = 0;
  let negativeWeight = 0;
  let neutralWeight = 0;
  
  sentiments.forEach(sentiment => {
    const weight = sentiment.score;
    
    switch (sentiment.label) {
      case 'POSITIVE':
        positiveWeight += weight;
        break;
      case 'NEGATIVE':
        negativeWeight += weight;
        break;
      case 'NEUTRAL':
        neutralWeight += weight * 0.3; // Neutral has less impact
        break;
    }
  });
  
  const totalWeight = positiveWeight + negativeWeight + neutralWeight;
  
  if (totalWeight === 0) {
    return { label: 'NEUTRAL', score: 0.5 };
  }
  
  const positiveRatio = positiveWeight / totalWeight;
  const negativeRatio = negativeWeight / totalWeight;
  
  // Need significant majority to declare overall sentiment
  if (positiveRatio > negativeRatio && positiveRatio > 0.4) {
    return {
      label: 'POSITIVE',
      score: Math.min(0.95, 0.5 + positiveRatio * 0.45)
    };
  } else if (negativeRatio > positiveRatio && negativeRatio > 0.4) {
    return {
      label: 'NEGATIVE',
      score: Math.min(0.95, 0.5 + negativeRatio * 0.45)
    };
  } else {
    return {
      label: 'NEUTRAL',
      score: 0.5
    };
  }
}
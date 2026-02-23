import React, { useState, useEffect } from 'react';

interface NewsArticle {
  title: string;
  description: string;
  source?: { name: string };
  publishedAt: string;
}

interface ArticlesSummaryProps {
  articles: NewsArticle[];
  companyName: string;
}

interface AISummary {
  executiveSummary: string;
  keyThemes: string[];
  sentimentAnalysis: {
    overall: 'positive' | 'negative' | 'neutral';
    confidence: number;
    reasoning: string;
  };
  marketImpact: string;
  trendAnalysis: string;
  riskFactors: string[];
  opportunities: string[];
}

// Gemini API configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCoWLiN47cX_7saJqj2tEtU3w0cwHUdU_U';
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const ArticlesSummary: React.FC<ArticlesSummaryProps> = ({ articles, companyName }) => {
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic statistics
  const totalArticles = articles.length;
  const sourceStats = articles.reduce((acc, article) => {
    const sourceName = article.source?.name || 'Unknown';
    acc[sourceName] = (acc[sourceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSources = Object.entries(sourceStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const recentArticles = articles.filter(article => {
    const articleDate = new Date(article.publishedAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return articleDate >= sevenDaysAgo;
  }).length;

  const generateAISummary = async () => {
    if (!GEMINI_API_KEY) {
      setError('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Limit articles and shorten descriptions to stay within token limits
      const articlesData = articles.slice(0, 15).map(article => ({
        title: article.title,
        description: article.description?.substring(0, 150) || '',
        source: article.source?.name,
        publishedAt: article.publishedAt
      }));

      const prompt = `Analyze these news articles about ${companyName} and provide ONLY a valid JSON response with no markdown formatting:

Articles: ${JSON.stringify(articlesData)}

Return this exact JSON structure:
{
  "executiveSummary": "2-3 sentence summary",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "sentimentAnalysis": {
    "overall": "positive",
    "confidence": 0.85,
    "reasoning": "Brief explanation"
  },
  "marketImpact": "2-3 sentences",
  "trendAnalysis": "2-3 sentences",
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"]
}

Return ONLY the JSON object, no other text.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 0.9,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API Error:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Gemini API Response:', data);
      
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const finishReason = data.candidates?.[0]?.finishReason;

      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      if (finishReason === 'MAX_TOKENS') {
        console.warn('Response truncated due to token limit');
      }

      // Clean and parse JSON
      let jsonText = generatedText.trim();
      
      // Remove markdown code blocks
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Extract JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Raw response:', generatedText);
        throw new Error('Could not find valid JSON in response');
      }

      let parsedSummary;
      try {
        parsedSummary = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Parse error. Attempting cleanup...');
        // Try to fix common JSON issues
        let cleanedJson = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Quote unquoted keys
        
        parsedSummary = JSON.parse(cleanedJson);
      }

      // Validate required fields
      if (!parsedSummary.executiveSummary || !parsedSummary.sentimentAnalysis) {
        throw new Error('Invalid response structure');
      }

      setAiSummary(parsedSummary);

    } catch (err) {
      console.error('AI Summary generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate AI summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (articles.length > 0) {
      generateAISummary();
    }
  }, [articles, companyName]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">
          🤖 AI-Powered Analysis for {companyName}
        </h3>
        <button
          onClick={generateAISummary}
          disabled={loading || articles.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Analyzing...
            </>
          ) : (
            <>🔄 Refresh Analysis</>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{totalArticles}</div>
          <div className="text-sm text-blue-800">Total Articles</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{recentArticles}</div>
          <div className="text-sm text-green-800">Recent (7d)</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{Object.keys(sourceStats).length}</div>
          <div className="text-sm text-purple-800">News Sources</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{topSources[0]?.[1] || 0}</div>
          <div className="text-sm text-orange-800">Top Source</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-semibold">AI Analysis Unavailable</h4>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">AI is analyzing {totalArticles} articles about {companyName}...</p>
        </div>
      )}

      {/* AI Summary Results */}
      {aiSummary && !loading && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-l-4 border-blue-500">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📋 Executive Summary
            </h4>
            <p className="text-gray-700 leading-relaxed">{aiSummary.executiveSummary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Sentiment Analysis */}
            <div className="bg-white border rounded-lg p-5">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                {getSentimentIcon(aiSummary.sentimentAnalysis.overall)} Overall Sentiment
              </h4>
              <div className="space-y-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(aiSummary.sentimentAnalysis.overall)}`}>
                  {aiSummary.sentimentAnalysis.overall.toUpperCase()}
                  <span className="ml-2 text-xs">
                    ({Math.round(aiSummary.sentimentAnalysis.confidence * 100)}% confidence)
                  </span>
                </div>
                <p className="text-sm text-gray-600">{aiSummary.sentimentAnalysis.reasoning}</p>
              </div>
            </div>

            {/* Key Themes */}
            <div className="bg-white border rounded-lg p-5">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🎯 Key Themes
              </h4>
              <div className="flex flex-wrap gap-2">
                {aiSummary.keyThemes?.map((theme, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Market Impact & Trends */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-5 rounded-lg">
              <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                📊 Market Impact
              </h4>
              <p className="text-green-700 text-sm leading-relaxed">{aiSummary.marketImpact}</p>
            </div>

            <div className="bg-purple-50 p-5 rounded-lg">
              <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                📈 Trend Analysis
              </h4>
              <p className="text-purple-700 text-sm leading-relaxed">{aiSummary.trendAnalysis}</p>
            </div>
          </div>

          {/* Risk Factors & Opportunities */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-50 p-5 rounded-lg">
              <h4 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                ⚠️ Risk Factors
              </h4>
              <ul className="space-y-2">
                {aiSummary.riskFactors?.map((risk, index) => (
                  <li key={index} className="text-red-700 text-sm flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 p-5 rounded-lg">
              <h4 className="text-lg font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                💡 Opportunities
              </h4>
              <ul className="space-y-2">
                {aiSummary.opportunities?.map((opportunity, index) => (
                  <li key={index} className="text-emerald-700 text-sm flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>{opportunity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Source Distribution */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-3">📰 Top News Sources</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topSources.map(([source, count], index) => (
            <div key={source} className="flex items-center justify-between bg-white p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{source}</span>
              </div>
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArticlesSummary;
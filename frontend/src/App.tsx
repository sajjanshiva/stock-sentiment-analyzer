import React, { useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import SearchBar from './components/SearchBar';
import SentimentChart from './components/SentimentChart';
import NewsList from './components/NewsList';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import ArticlesSummary from './components/ArticlesSummary'; // 👈 ADD THIS IMPORT
import { fetchNews } from './utils/newsApi';
import { analyzeSentiment } from './utils/sentimentAnalysis';
import { NewsArticle, SentimentDistribution } from './types';

function App() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [distribution, setDistribution] = useState<SentimentDistribution>({
    positive: 0,
    neutral: 0,
    negative: 0,
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string>(''); // 👈 ADD THIS STATE
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const handleSearch = async (query: string) => {
    setLoading(true);
    setHasSearched(true);
    setCurrentQuery(query); // 👈 ADD THIS LINE
    
    try {
      // Fetch news articles
      const articles = await fetchNews(query);
      
      if (articles.length === 0) {
        showToast('No news articles found for this search term.', 'info');
        setNews([]);
        setDistribution({ positive: 0, neutral: 0, negative: 0 });
        setLoading(false);
        return;
      }

      // Analyze sentiment for each article
      const analyzedArticles: NewsArticle[] = [];
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

      for (const article of articles) {
        try {
          const sentiment = await analyzeSentiment(article.title);
          const analyzedArticle = {
            ...article,
            sentiment: sentiment.label,
            confidence: sentiment.score,
          };
          analyzedArticles.push(analyzedArticle);

          // Count sentiment distribution
          if (sentiment.label === 'POSITIVE') {
            sentimentCounts.positive++;
          } else if (sentiment.label === 'NEGATIVE') {
            sentimentCounts.negative++;
          } else {
            sentimentCounts.neutral++;
          }
        } catch (error) {
          console.error('Error analyzing sentiment for article:', article.title, error);
          // Add article with neutral sentiment as fallback
          analyzedArticles.push({
            ...article,
            sentiment: 'NEUTRAL',
            confidence: 0.5,
          });
          sentimentCounts.neutral++;
        }
      }

      setNews(analyzedArticles);
      setDistribution(sentimentCounts);
      showToast(`Successfully analyzed ${analyzedArticles.length} articles for "${query}"`, 'success');
      
    } catch (error) {
      console.error('Error during analysis:', error);
      showToast('Failed to analyze sentiment. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Sentiment Analyzer</h1>
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-center text-gray-600 mt-2">
            Analyze market sentiment from real-time news headlines
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="text-center mb-12">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Results Section */}
        {loading && <LoadingSpinner />}
        
        {!loading && hasSearched && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sentiment Chart */}
              <div className="lg:col-span-1">
                <SentimentChart distribution={distribution} />
              </div>
              
              {/* News List */}
              <div className="lg:col-span-1">
                <NewsList news={news} />
              </div>
            </div>
            
            {/* 👈 ADD THIS: AI-Powered Articles Summary */}
            {news.length > 0 && (
              <ArticlesSummary 
                articles={news} 
                companyName={currentQuery} 
              />
            )}
          </>
        )}

        {/* Welcome Message */}
        {!loading && !hasSearched && (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-lg p-12 max-w-2xl mx-auto">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Stock Sentiment Analyzer
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Get instant insights into market sentiment by analyzing real-time news headlines. 
                Simply enter a stock symbol or company name to see how the market is feeling.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                <div className="text-center">
                  <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">🟢</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">Positive</div>
                  <div className="text-xs text-gray-500">Bullish sentiment</div>
                </div>
                <div className="text-center">
                  <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">🟡</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">Neutral</div>
                  <div className="text-xs text-gray-500">Balanced outlook</div>
                </div>
                <div className="text-center">
                  <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">🔴</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">Negative</div>
                  <div className="text-xs text-gray-500">Bearish sentiment</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Powered by NewsAPI and Hugging Face • Built with React and Tailwind CSS</p>
            <p className="mt-1">
              
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
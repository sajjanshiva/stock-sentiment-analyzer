import React from 'react';
import { ExternalLink, Calendar } from 'lucide-react';
import { NewsArticle } from '../types';

interface NewsListProps {
  news: NewsArticle[];
}

const NewsList: React.FC<NewsListProps> = ({ news }) => {
  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return '🟢';
      case 'NEGATIVE':
        return '🔴';
      case 'NEUTRAL':
      default:
        return '🟡';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'NEGATIVE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'NEUTRAL':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (news.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Top Headlines</h3>
        <div className="text-center text-gray-500 py-8">
          No news articles found. Try searching for a different company or stock.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-6 text-gray-800">Top Headlines</h3>
      <div className="space-y-4">
        {news.map((article, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(
                      article.sentiment
                    )}`}
                  >
                    {getSentimentIcon(article.sentiment)} {article.sentiment || 'NEUTRAL'}
                  </span>
                  <span className="text-sm text-gray-500">{article.source.name}</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 leading-tight">
                  {article.title}
                </h4>
                {article.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {article.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(article.publishedAt)}
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                  >
                    Read more
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsList;
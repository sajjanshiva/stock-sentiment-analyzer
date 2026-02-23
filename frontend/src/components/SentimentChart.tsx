import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import { SentimentDistribution } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SentimentChartProps {
  distribution: SentimentDistribution;
  title?: string;
  showPercentages?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const SentimentChart: React.FC<SentimentChartProps> = ({ 
  distribution, 
  title = "Sentiment Distribution",
  showPercentages = true,
  size = 'medium'
}) => {
  const total = distribution.positive + distribution.neutral + distribution.negative;

  // Calculate percentages
  const positivePercent = total > 0 ? ((distribution.positive / total) * 100).toFixed(1) : '0.0';
  const neutralPercent = total > 0 ? ((distribution.neutral / total) * 100).toFixed(1) : '0.0';
  const negativePercent = total > 0 ? ((distribution.negative / total) * 100).toFixed(1) : '0.0';

  const chartHeight = {
    small: 'h-48',
    medium: 'h-64',
    large: 'h-80'
  }[size];

  const data = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [distribution.positive, distribution.neutral, distribution.negative],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Green for positive
          'rgba(245, 158, 11, 0.8)', // Yellow for neutral
          'rgba(239, 68, 68, 0.8)',  // Red for negative
        ],
        borderColor: [
          'rgba(5, 150, 105, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(220, 38, 38, 1)',
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(52, 211, 153, 0.9)',
          'rgba(251, 191, 36, 0.9)',
          'rgba(248, 113, 113, 0.9)',
        ],
        hoverBorderColor: [
          'rgba(5, 150, 105, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(220, 38, 38, 1)',
        ],
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          font: {
            size: 14,
            weight: '500' as const,
          },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: TooltipItem<'pie'>) {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} articles (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    cutout: '0%', // Makes it a full pie chart
    radius: '80%',
  };

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-xl font-semibold mb-6 text-center text-gray-800">
          {title}
        </h3>
        <div className={`flex flex-col items-center justify-center ${chartHeight} text-gray-500`}>
          <svg 
            className="w-16 h-16 mb-4 text-gray-300" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
            />
          </svg>
          <p className="text-lg font-medium">No sentiment data available</p>
          <p className="text-sm">Analyze some articles to see sentiment distribution</p>
        </div>
      </div>
    );
  }

  // Determine overall sentiment
  const getOverallSentiment = () => {
    const max = Math.max(distribution.positive, distribution.neutral, distribution.negative);
    if (max === distribution.positive) return { label: 'Positive', color: 'text-green-600', icon: '📈' };
    if (max === distribution.negative) return { label: 'Negative', color: 'text-red-600', icon: '📉' };
    return { label: 'Neutral', color: 'text-yellow-600', icon: '➖' };
  };

  const overallSentiment = getOverallSentiment();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{overallSentiment.icon}</span>
          <span className={`text-sm font-medium ${overallSentiment.color}`}>
            Overall: {overallSentiment.label}
          </span>
        </div>
      </div>
      
      <div className={`${chartHeight} mb-6`}>
        <Pie data={data} options={options} />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 transition-all duration-200 hover:bg-green-100">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700">Positive</span>
          </div>
          <div className="text-2xl font-bold text-green-600 mb-1">
            {distribution.positive}
          </div>
          {showPercentages && (
            <div className="text-xs text-green-600 font-medium">
              {positivePercent}%
            </div>
          )}
        </div>
        
        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200 transition-all duration-200 hover:bg-yellow-100">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700">Neutral</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            {distribution.neutral}
          </div>
          {showPercentages && (
            <div className="text-xs text-yellow-600 font-medium">
              {neutralPercent}%
            </div>
          )}
        </div>
        
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200 transition-all duration-200 hover:bg-red-100">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700">Negative</span>
          </div>
          <div className="text-2xl font-bold text-red-600 mb-1">
            {distribution.negative}
          </div>
          {showPercentages && (
            <div className="text-xs text-red-600 font-medium">
              {negativePercent}%
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Total Articles Analyzed:</span>
          <span className="font-semibold text-gray-800">{total}</span>
        </div>
      </div>
    </div>
  );
};

export default SentimentChart;
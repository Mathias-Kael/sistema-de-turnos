import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  current: number;
  previous?: number;
  inverse?: boolean; // If true, lower is better (e.g. cancellations)
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ current, previous, inverse = false }) => {
  if (previous === undefined || previous === 0) return null;

  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  // Determine color based on trend and inverse flag
  let colorClass = 'text-gray-500';
  let Icon = Minus;

  if (!isNeutral) {
    if (inverse) {
      colorClass = isPositive ? 'text-red-500' : 'text-green-500';
    } else {
      colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    }
    Icon = isPositive ? TrendingUp : TrendingDown;
  }

  return (
    <div className={`flex items-center text-xs font-medium ${colorClass}`}>
      <Icon className="w-3 h-3 mr-1" />
      <span>{Math.abs(percentage).toFixed(1)}%</span>
      <span className="ml-1 text-gray-400">vs periodo anterior</span>
    </div>
  );
};

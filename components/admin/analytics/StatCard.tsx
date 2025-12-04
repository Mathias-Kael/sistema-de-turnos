import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { SecondaryText } from '../../ui';
import { TrendIndicator } from './TrendIndicator';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  previousValue?: number;
  highlight?: boolean;
}

const useCountUp = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end); // Ensure final value is exact
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
};

export const StatCard: React.FC<StatCardProps> = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  prefix = '', 
  suffix = '',
  previousValue,
  highlight = false
}) => {
  const count = useCountUp(value);

  return (
    <div className={`bg-surface p-4 rounded-lg shadow-md border ${highlight ? 'border-primary ring-1 ring-primary/20' : 'border-default'} flex flex-col justify-between h-full transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-full ${highlight ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
          <Icon className="h-5 w-5" />
        </div>
        {highlight && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Destacado
          </span>
        )}
      </div>
      
      <div>
        <SecondaryText className="text-sm font-medium mb-1">{title}</SecondaryText>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-primary">
            {prefix}{count.toLocaleString()}{suffix}
          </span>
        </div>
        {previousValue !== undefined && (
          <div className="mt-2">
            <TrendIndicator current={value} previous={previousValue} />
          </div>
        )}
      </div>
    </div>
  );
});

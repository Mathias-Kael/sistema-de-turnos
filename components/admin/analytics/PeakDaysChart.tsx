import React from 'react';
import { PeakDay } from '../../../types';
import { CalendarClock } from 'lucide-react';

interface PeakDaysChartProps {
  days: PeakDay[];
}

export const PeakDaysChart: React.FC<PeakDaysChartProps> = React.memo(({ days }) => {
  if (days.length === 0) {
    return (
      <div className="bg-surface rounded-lg shadow-md border border-default p-4 h-full flex flex-col justify-center items-center text-gray-500">
        <CalendarClock className="w-8 h-8 mb-2 opacity-20" />
        <p>Aún no hay datos de días pico.</p>
      </div>
    );
  }

  const maxReservas = Math.max(...days.map(d => d.total_reservas));

  return (
    <div className="bg-surface rounded-lg shadow-md border border-default p-4 h-full">
      <div className="flex items-center mb-6">
        <CalendarClock className="w-5 h-5 text-purple-500 mr-2" />
        <h3 className="font-bold text-lg text-primary">Días Más Concurridos</h3>
      </div>
      
      <div className="flex items-end justify-between h-40 space-x-2 px-2">
        {days.map((day, index) => {
          const heightPercentage = maxReservas > 0 ? (day.total_reservas / maxReservas) * 100 : 0;
          return (
            <div key={index} className="flex flex-col items-center flex-1 group">
              <div className="relative w-full flex justify-center items-end h-full">
                <div 
                  className="w-full max-w-[30px] bg-primary/80 rounded-t-md transition-all duration-1000 ease-out group-hover:bg-primary relative"
                  style={{ height: `${heightPercentage}%` }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {day.total_reservas} reservas
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium truncate w-full text-center capitalize">
                {day.dia_nombre.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

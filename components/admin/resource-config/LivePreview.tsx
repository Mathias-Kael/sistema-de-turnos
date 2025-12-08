import React from 'react';
import { ResourceTerminology } from '../../../types';
import { ChevronLeft, Menu, Calendar, Clock } from 'lucide-react';

interface LivePreviewProps {
  config: ResourceTerminology;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ config }) => {
  const { labels } = config;

  return (
    <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl flex flex-col overflow-hidden">
      {/* Notch / Status Bar Mock */}
      <div className="h-[32px] bg-gray-800 w-full absolute top-0 left-0 z-20 rounded-t-[2rem]"></div>
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-[18px] w-[100px] bg-black rounded-b-[1rem] z-30"></div>

      {/* Screen Content */}
      <div className="flex-1 bg-white w-full h-full pt-8 flex flex-col relative overflow-y-auto no-scrollbar">
        
        {/* Header Mock */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
          <ChevronLeft size={20} className="text-gray-600" />
          <span className="font-semibold text-sm text-gray-800">Reservar Turno</span>
          <Menu size={20} className="text-gray-600" />
        </div>

        {/* Dynamic Content Area */}
        <div className="p-4 space-y-6">
          
          {/* Step 1: Service Selection (Static Context) */}
          <div className="space-y-2 opacity-50">
            <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            <div className="p-3 border rounded-lg flex justify-between items-center">
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
              <div className="h-4 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Step 2: The Dynamic Part */}
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
              <h3 className="font-bold text-gray-900 text-sm">
                {config.type === 'person' 
                  ? `¿Con qué ${labels.singular.toLowerCase()}?`
                  : `¿Qué ${labels.singular.toLowerCase()} prefieres?`
                }
              </h3>
            </div>

            {/* Resource Cards Mock */}
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((i) => (
                <div key={i} className="border rounded-lg p-2 flex flex-col items-center gap-2 bg-white shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {/* Placeholder for Avatar/Icon */}
                    <span className="text-xs text-gray-400">Img</span>
                  </div>
                  <div className="text-center">
                    <div className="h-3 w-16 bg-gray-200 rounded mb-1 mx-auto"></div>
                    <div className="h-2 w-10 bg-gray-100 rounded mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Date/Time (Static Context) */}
          <div className="space-y-3 opacity-50">
             <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs font-bold">3</span>
              <h3 className="font-bold text-gray-400 text-sm">Fecha y Hora</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
               {[1, 2, 3].map(i => (
                 <div key={i} className="min-w-[60px] h-16 border rounded-lg bg-gray-50"></div>
               ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-4">
            <button className="w-full py-3 bg-black text-white rounded-lg text-sm font-medium shadow-lg transform transition-transform active:scale-95">
              {labels.action} {labels.singular}
            </button>
          </div>

        </div>
      </div>

      {/* Home Indicator */}
      <div className="h-[4px] w-[100px] bg-gray-600 rounded-full absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20"></div>
    </div>
  );
};
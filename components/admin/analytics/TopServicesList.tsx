import React from 'react';
import { TopService } from '../../../types';
import { Trophy } from 'lucide-react';

interface TopServicesListProps {
  services: TopService[];
}

export const TopServicesList: React.FC<TopServicesListProps> = React.memo(({ services }) => {
  if (services.length === 0) {
    return (
      <div className="bg-surface rounded-lg shadow-md border border-default p-4 h-full flex flex-col justify-center items-center text-gray-500">
        <Trophy className="w-8 h-8 mb-2 opacity-20" />
        <p>Aún no hay datos de servicios.</p>
      </div>
    );
  }

  const maxReservas = Math.max(...services.map(s => s.total_reservas));

  return (
    <div className="bg-surface rounded-lg shadow-md border border-default p-4 h-full">
      <div className="flex items-center mb-4">
        <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
        <h3 className="font-bold text-lg text-primary">Servicios Top</h3>
      </div>
      <div className="space-y-4">
        {services.map((service, index) => (
          <div key={index} className="relative">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 ${index === 0 ? 'bg-yellow-100 text-yellow-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                  {index + 1}
                </span>
                {service.servicio}
              </span>
              <span className="font-bold text-primary">{service.total_reservas} reservas</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(service.total_reservas / maxReservas) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1 text-right">
              ${service.ingresos_total.toLocaleString()} generados
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

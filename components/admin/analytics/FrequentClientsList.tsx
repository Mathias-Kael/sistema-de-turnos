import React from 'react';
import { FrequentClient } from '../../../types';
import { Users, Star } from 'lucide-react';

interface FrequentClientsListProps {
  clients: FrequentClient[];
}

export const FrequentClientsList: React.FC<FrequentClientsListProps> = ({ clients }) => {
  if (clients.length === 0) {
    return (
      <div className="bg-surface rounded-lg shadow-md border border-default p-4 h-full flex flex-col justify-center items-center text-gray-500">
        <Users className="w-8 h-8 mb-2 opacity-20" />
        <p>Aún no hay clientes frecuentes.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg shadow-md border border-default p-4 h-full">
      <div className="flex items-center mb-4">
        <Users className="w-5 h-5 text-blue-500 mr-2" />
        <h3 className="font-bold text-lg text-primary">Clientes Fieles</h3>
      </div>
      <div className="space-y-3">
        {clients.map((client, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary/30 transition-colors">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mr-3 text-sm">
                {client.cliente.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">{client.cliente}</p>
                <p className="text-[10px] text-gray-500">Última visita: {new Date(client.ultima_visita).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center text-yellow-500 font-bold text-sm">
                <Star className="w-3 h-3 mr-1 fill-current" />
                {client.total_reservas}
              </div>
              <span className="text-[10px] text-gray-400 uppercase">Reservas</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

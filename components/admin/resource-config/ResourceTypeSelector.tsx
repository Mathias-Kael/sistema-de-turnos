import React from 'react';
import { ResourceType } from '../../../types';
import { User, MapPin } from 'lucide-react';

interface ResourceTypeSelectorProps {
  selectedType: ResourceType;
  onSelect: (type: ResourceType) => void;
}

export const ResourceTypeSelector: React.FC<ResourceTypeSelectorProps> = ({
  selectedType,
  onSelect,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <button
        onClick={() => onSelect('person')}
        className={`
          relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200
          ${selectedType === 'person'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
        aria-pressed={selectedType === 'person'}
      >
        <div className={`p-3 rounded-full mb-3 ${selectedType === 'person' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <User size={32} className={selectedType === 'person' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
        </div>
        <span className="font-semibold text-lg">Personas</span>
        <span className="text-sm mt-1 opacity-80">Profesionales, Doctores, Staff</span>
        
        {selectedType === 'person' && (
          <div className="absolute top-3 right-3 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
      </button>

      <button
        onClick={() => onSelect('space')}
        className={`
          relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200
          ${selectedType === 'space'
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
        aria-pressed={selectedType === 'space'}
      >
        <div className={`p-3 rounded-full mb-3 ${selectedType === 'space' ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <MapPin size={32} className={selectedType === 'space' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'} />
        </div>
        <span className="font-semibold text-lg">Espacios</span>
        <span className="text-sm mt-1 opacity-80">Canchas, Salas, Consultorios</span>

        {selectedType === 'space' && (
          <div className="absolute top-3 right-3 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
};
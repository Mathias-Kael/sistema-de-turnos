import React from 'react';
import { CategoryIcon, ResourceType } from '../../../types';
import { 
  Briefcase, Heart, Scissors, GraduationCap, 
  Trophy, Home, Music, Box, Star, Calendar, Eye, Brush
} from 'lucide-react';

interface CategoryPickerProps {
  selectedIcon: CategoryIcon;
  resourceType: ResourceType;
  onSelect: (icon: CategoryIcon) => void;
}

// Mapeo de iconos disponibles
const ICON_MAP: Record<CategoryIcon, React.ElementType> = {
  'none': Star, // Fallback
  'briefcase': Briefcase,
  'heart': Heart,
  'brush': Brush, // Usado como fallback para estilista/scissors si no existe
  'academic': GraduationCap,
  'trophy': Trophy,
  'home': Home,
  'music': Music,
  'cake': Box, // Usando Box como proxy visual o Cake si existiera en lucide
  'star': Star,
  'calendar': Calendar,
  'eye': Eye,
};

// Filtrar iconos relevantes según el tipo de recurso para reducir ruido visual
const RELEVANT_ICONS: Record<ResourceType, CategoryIcon[]> = {
  person: ['briefcase', 'heart', 'brush', 'academic', 'star', 'eye'],
  space: ['trophy', 'home', 'music', 'cake', 'calendar', 'star']
};

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedIcon,
  resourceType,
  onSelect
}) => {
  const iconsToShow = RELEVANT_ICONS[resourceType];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Icono Representativo
      </label>
      <div className="grid grid-cols-6 gap-2">
        {iconsToShow.map((iconKey) => {
          const IconComponent = ICON_MAP[iconKey];
          const isSelected = selectedIcon === iconKey;

          return (
            <button
              key={iconKey}
              onClick={() => onSelect(iconKey)}
              className={`
                flex items-center justify-center p-3 rounded-lg border transition-all
                ${isSelected
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }
              `}
              title={iconKey}
              type="button"
            >
              <IconComponent size={24} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
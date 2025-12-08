import React from 'react';
import { useResourceTerminology } from '../../../hooks/useResourceTerminology';
import { ResourceTypeSelector } from './ResourceTypeSelector';
import { CategoryPicker } from './CategoryPicker';
import { LivePreview } from './LivePreview';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { ResourceTerminology } from '../../../types';

interface ResourceConfigurationWizardProps {
  initialConfig?: ResourceTerminology;
  onSave: (config: ResourceTerminology) => void;
  onCancel: () => void;
}

export const ResourceConfigurationWizard: React.FC<ResourceConfigurationWizardProps> = ({
  initialConfig,
  onSave,
  onCancel
}) => {
  const {
    config,
    setResourceType,
    updateLabels,
    updateIcon,
    uiHelpers
  } = useResourceTerminology(initialConfig);

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full min-h-[80vh] bg-white dark:bg-gray-900 p-4 rounded-lg overflow-hidden">
      {/* Left Panel: Configuration Form */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Configuración de Recursos</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Define cómo se llaman tus recursos (personas o espacios) para adaptar la experiencia de reserva a tu negocio.
            </p>
            
            <ResourceTypeSelector 
              selectedType={config.type} 
              onSelect={setResourceType} 
            />
          </section>

          <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 animate-fade-in mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Personalización</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Input
                label="Nombre Singular"
                value={config.labels.singular}
                onChange={(e) => updateLabels({ singular: e.target.value })}
                placeholder={uiHelpers.placeholderText}
                helperText="Ej: Profesional, Cancha, Doctor"
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              />
              <Input
                label="Nombre Plural"
                value={config.labels.plural}
                onChange={(e) => updateLabels({ plural: e.target.value })}
                placeholder={`Ej: ${config.labels.singular}s`}
                helperText="Usado en listas y filtros"
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              />
            </div>

            <div className="mb-6">
               <Input
                label="Acción de Reserva"
                value={config.labels.action}
                onChange={(e) => updateLabels({ action: e.target.value })}
                placeholder="Ej: Reservar con"
                helperText="Texto del botón principal (ej: 'Reservar con' o 'Alquilar')"
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              />
            </div>

            <CategoryPicker 
              selectedIcon={config.categoryIcon}
              resourceType={config.type}
              onSelect={updateIcon}
            />
          </section>

          {/* Mobile Preview (Simplified) - Moved to bottom */}
          <div className="lg:hidden mt-6 mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 text-center">
              Vista Previa Simplificada
            </h3>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm w-full max-w-xs border border-gray-100 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {uiHelpers.questionText}
                </p>
                <div className="flex gap-2">
                  <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-400">Img</span>
                  </div>
                  <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-400">Img</span>
                  </div>
                </div>
                <button className="mt-3 w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded text-xs font-medium">
                  {uiHelpers.actionButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4 bg-white dark:bg-gray-900 sticky bottom-0 z-10">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Configuración
          </Button>
        </div>
      </div>

      {/* Right Panel: Live Preview - Visible on desktop */}
      <div className="hidden lg:flex lg:w-[350px] flex-shrink-0 flex-col items-center justify-start pt-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-full overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 py-2 w-full text-center">
          Vista Previa Cliente
        </h3>
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="transform scale-90 origin-top">
             <LivePreview config={config} />
          </div>
        </div>
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-6 max-w-[250px]">
          Así verán tus clientes el flujo de reserva en sus dispositivos móviles.
        </p>
      </div>
    </div>
  );
};
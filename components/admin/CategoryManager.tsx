import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Category, CategoryIcon } from '../../types';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { CategoryEditModal } from './CategoryEditModal';

// SVG Icons
const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export const CategoryManager: React.FC = () => {
  const business = useBusinessState();
  const dispatch = useBusinessDispatch();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (category?: Category) => {
    setEditingCategory(category || null);
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setError(null);
  };

  const handleSaveCategory = async (name: string, icon: CategoryIcon) => {
    setError(null);
    try {
      if (editingCategory) {
        // Actualizar categoría existente
        await dispatch({
          type: 'UPDATE_CATEGORY',
          payload: { categoryId: editingCategory.id, name, icon },
        });
      } else {
        // Crear nueva categoría
        await dispatch({
          type: 'CREATE_CATEGORY',
          payload: { name, icon },
        });
      }
      handleCloseModal();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setError(null);
    if (window.confirm('¿Seguro que quieres eliminar esta categoría? Los servicios asignados no se eliminarán.')) {
      try {
        await dispatch({ type: 'DELETE_CATEGORY', payload: categoryId });
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const getCategoryServiceCount = (categoryId: string): number => {
    return business.services.filter(s => s.categoryIds?.includes(categoryId)).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-medium text-primary">Gestión de Categorías</h3>
        <Button 
          onClick={() => handleOpenModal()} 
          variant="primary" 
          className="w-full sm:w-auto"
          aria-label="Agregar nueva categoría"
        >
          Agregar Categoría
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {business.categories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-default rounded-md bg-surface">
          <FolderIcon className="w-12 h-12 mx-auto text-secondary mb-3" />
          <p className="text-secondary">No hay categorías creadas aún</p>
          <p className="text-sm text-secondary mt-1">
            Las categorías te ayudan a organizar tus servicios
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {business.categories.map(category => {
            const serviceCount = getCategoryServiceCount(category.id);
            
            return (
              <div
                key={category.id}
                className="p-4 border border-default rounded-md bg-surface hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FolderIcon className="w-5 h-5 text-brand-text flex-shrink-0" />
                    <h4 className="font-semibold text-primary truncate">{category.name}</h4>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleOpenModal(category)}
                      className="p-1.5 hover:bg-background rounded transition-colors"
                      title="Editar categoría"
                      aria-label={`Editar categoría ${category.name}`}
                    >
                      <PencilIcon className="w-4 h-4 text-secondary" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1.5 hover:bg-background rounded transition-colors"
                      title="Eliminar categoría"
                      aria-label={`Eliminar categoría ${category.name}`}
                    >
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-secondary">
                  {serviceCount} {serviceCount === 1 ? 'servicio' : 'servicios'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <CategoryEditModal
          category={editingCategory}
          onClose={handleCloseModal}
          onSave={handleSaveCategory}
          error={error}
        />
      )}
    </div>
  );
};

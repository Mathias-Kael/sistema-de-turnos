import React, { useState, useEffect } from 'react';
import { Client, ClientInput } from '../../types';
import { supabaseBackend } from '../../services/supabaseBackend';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ErrorMessage } from '../ui/ErrorMessage';

interface ClientFormModalProps {
  businessId: string;
  client?: Client | null; // Si existe, modo edición
  onClose: () => void;
  onSave: (client: Client) => void;
  initialName?: string; // Para pre-llenar si viene del autocomplete
}

/**
 * ClientFormModal - Modal para crear/editar clientes
 * 
 * Features:
 * - Modo crear/editar automático
 * - Validación inline
 * - Tags management
 * - Error handling con mensajes descriptivos
 */
export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  businessId,
  client,
  onClose,
  onSave,
  initialName = '',
}) => {
  const [formData, setFormData] = useState<ClientInput>({
    name: client?.name || initialName,
    phone: client?.phone || '',
    email: client?.email || '',
    notes: client?.notes || '',
    tags: client?.tags || [],
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!client;

  // Sugerencias de tags comunes
  const suggestedTags = ['VIP', 'Frecuente', 'Nuevo', 'Regular', 'Cumpleaños'];

  const handleChange = (field: keyof ClientInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null); // Limpiar error al escribir
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), trimmedTag],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('El nombre es obligatorio');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('El teléfono es obligatorio');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('El email no es válido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      let savedClient: Client;

      if (isEditMode && client) {
        // Actualizar cliente existente
        savedClient = await supabaseBackend.updateClient(client.id, formData);
      } else {
        // Crear nuevo cliente
        savedClient = await supabaseBackend.createClient({
          business_id: businessId,
          ...formData,
        });
      }

      onSave(savedClient);
      onClose();
    } catch (err: any) {
      console.error('Error saving client:', err);
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 overflow-y-auto z-50" onClick={onClose}>
      <div className="min-h-full flex items-start md:items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary">
              {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <p className="text-secondary text-sm mt-1">
              {isEditMode ? 'Actualiza los datos del cliente' : 'Completa los datos del nuevo cliente'}
            </p>
          </div>

          {/* Error Message */}
          {error && <ErrorMessage message={error} className="mb-4" />}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Juan Pérez"
                required
                disabled={isLoading}
                containerClassName="w-full"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+54 9 11 1234-5678"
                required
                disabled={isLoading}
                containerClassName="w-full"
              />
              <p className="text-xs text-secondary mt-1">
                Formato: +54 9 11 1234-5678 o 1112345678
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Email <span className="text-secondary text-xs">(opcional)</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="cliente@ejemplo.com"
                disabled={isLoading}
                containerClassName="w-full"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Notas <span className="text-secondary text-xs">(opcional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Preferencias, alergias, comentarios..."
                rows={3}
                disabled={isLoading}
                className="w-full p-2 border border-default rounded-md bg-background text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Etiquetas <span className="text-secondary text-xs">(opcional)</span>
              </label>
              
              {/* Tags actuales */}
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500"
                        disabled={isLoading}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input para agregar tag */}
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe y presiona Enter"
                  disabled={isLoading}
                  containerClassName="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  variant="secondary"
                  size="md"
                  disabled={!tagInput.trim() || isLoading}
                >
                  Agregar
                </Button>
              </div>

              {/* Sugerencias de tags */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-secondary">Sugerencias:</span>
                {suggestedTags
                  .filter(tag => !formData.tags?.includes(tag))
                  .map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="text-xs px-2 py-1 bg-background border border-default rounded-full text-secondary hover:bg-primary/5 hover:text-primary hover:border-primary transition-colors"
                      disabled={isLoading}
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 mt-6 border-t border-default">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              size="lg"
              disabled={isLoading}
              className="w-full sm:w-auto sm:flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full sm:w-auto sm:flex-1"
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-brand-text mr-2"></span>
                  Guardando...
                </>
              ) : (
                isEditMode ? 'Actualizar Cliente' : 'Crear Cliente'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

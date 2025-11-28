import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../../types';
import { supabaseBackend } from '../../services/supabaseBackend';
import { SecondaryText } from '../ui';

interface ClientSearchInputProps {
  businessId: string;
  onClientSelect: (client: Client | null) => void;
  onCreateNewClient: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ClientSearchInput - Autocomplete para buscar clientes existentes
 * 
 * Features:
 * - Debounce de 300ms para reducir queries
 * - Búsqueda por nombre o teléfono
 * - Lista de clientes recientes si no hay query
 * - Opción "Crear nuevo cliente"
 * - Keyboard navigation (arrows, enter, escape)
 */
export const ClientSearchInput: React.FC<ClientSearchInputProps> = ({
  businessId,
  onClientSelect,
  onCreateNewClient,
  disabled = false,
  placeholder = 'Buscar cliente por nombre o teléfono...',
}) => {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!businessId) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await supabaseBackend.searchClients(businessId, query);
        setClients(results);
        // Solo abrir dropdown si NO hay un cliente ya seleccionado
        // (evita reapertura después de seleccionar)
        if (!selectedClient) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error searching clients:', error);
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [query, businessId, selectedClient]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setQuery(client.name);
    setIsOpen(false);
    onClientSelect(client);
  };

  const handleClear = () => {
    setSelectedClient(null);
    setQuery('');
    setClients([]);
    setIsOpen(false);
    onClientSelect(null);
    inputRef.current?.focus();
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    onCreateNewClient();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, clients.length)); // +1 for "Create new" option
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex === clients.length) {
          handleCreateNew();
        } else if (selectedIndex >= 0) {
          handleSelectClient(clients[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative w-full">
      {/* Input con icono de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const newQuery = e.target.value;
            setQuery(newQuery);

            // Solo resetear si está editando DESPUÉS de haber seleccionado
            if (selectedClient && newQuery !== selectedClient.name) {
              setSelectedClient(null);
            }

            setSelectedIndex(-1);
          }}
          onFocus={() => {
            // Solo abrir si no hay cliente seleccionado
            if (!selectedClient) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 p-2 border border-default rounded-md bg-background text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Botón para limpiar */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary hover:text-primary"
            disabled={disabled}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-surface border border-default rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-secondary">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="ml-2">Buscando...</span>
            </div>
          ) : clients.length > 0 ? (
            <>
              {/* Lista de clientes */}
              {clients.map((client, index) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className={`w-full text-left px-4 py-3 hover:bg-background transition-colors ${
                    selectedIndex === index ? 'bg-background' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-primary truncate">
                        {client.name}
                      </div>
                      <SecondaryText className="truncate">
                        {client.phone}
                      </SecondaryText>
                      {client.email && (
                        <SecondaryText size="xs" className="truncate">
                          {client.email}
                        </SecondaryText>
                      )}
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {client.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-default"></div>
            </>
          ) : query.length > 0 ? (
            <div className="p-4 text-center text-secondary">
              No se encontraron clientes
            </div>
          ) : (
            <div className="p-4 text-center text-secondary">
              Escribe para buscar clientes
            </div>
          )}

          {/* Opción "Crear nuevo cliente" */}
          <button
            type="button"
            onClick={handleCreateNew}
            className={`w-full text-left px-4 py-3 hover:bg-background transition-colors flex items-center gap-3 border-t border-default ${
              selectedIndex === clients.length ? 'bg-background' : ''
            }`}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-primary">
                Crear nuevo cliente
              </div>
              {query && (
                <SecondaryText>
                  {query}
                </SecondaryText>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Cliente seleccionado (visual feedback) */}
      {selectedClient && !isOpen && (
        <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary">
                Cliente seleccionado: {selectedClient.name}
              </div>
              <SecondaryText size="xs">
                {selectedClient.phone}
              </SecondaryText>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-secondary hover:text-primary text-sm"
              disabled={disabled}
            >
              Cambiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

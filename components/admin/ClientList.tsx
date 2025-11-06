import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import { supabaseBackend } from '../../services/supabaseBackend';
import { useBusinessState } from '../../context/BusinessContext';
import { ClientFormModal } from '../common/ClientFormModal';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';

/**
 * ClientList - Vista de administración de clientes
 * 
 * Features:
 * - Lista de clientes con búsqueda
 * - Crear/Editar/Eliminar clientes
 * - Vista de historial de reservas por cliente (futuro)
 */
export const ClientList: React.FC = () => {
  const business = useBusinessState();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Load initial clients
  useEffect(() => {
    loadClients();
  }, [business.id]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const results = await supabaseBackend.searchClients(business.id, searchQuery);
      setClients(results);
    } catch (err: any) {
      console.error('Error loading clients:', err);
      setError('Error al cargar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadClients();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowFormModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowFormModal(true);
  };

  const handleClientSaved = () => {
    setShowFormModal(false);
    setEditingClient(null);
    loadClients(); // Refresh list
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`¿Eliminar cliente ${client.name}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setIsDeleting(client.id);
    try {
      await supabaseBackend.deleteClient(client.id);
      loadClients(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Error al eliminar cliente');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-primary">Clientes</h3>
          <p className="text-sm text-secondary mt-1">
            Gestiona tu base de clientes recurrentes
          </p>
        </div>
        <Button
          onClick={handleCreateClient}
          variant="primary"
          size="md"
        >
          + Nuevo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-10 pr-4 p-2 border border-default rounded-md bg-background text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} />}

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-secondary mt-2">Cargando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-surface rounded-lg border border-default">
          <svg className="w-16 h-16 mx-auto text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-primary mb-2">
            {searchQuery ? 'No se encontraron clientes' : 'No hay clientes aún'}
          </h3>
          <p className="text-secondary mb-4">
            {searchQuery
              ? 'Intenta con otro término de búsqueda'
              : 'Crea tu primer cliente para comenzar a gestionar reservas recurrentes'}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreateClient} variant="primary" size="md">
              Crear Primer Cliente
            </Button>
          )}
        </div>
      ) : (
        /* Clients Table */
        <div className="bg-surface rounded-lg border border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-default">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden md:table-cell">
                    Contacto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Etiquetas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-background transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-primary">{client.name}</div>
                        <div className="text-sm text-secondary md:hidden">{client.phone}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-sm text-primary">{client.phone}</div>
                      {client.email && (
                        <div className="text-xs text-secondary truncate max-w-xs">{client.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {client.tags && client.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClient(client)}
                          className="text-sm text-primary hover:text-primary-dark font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          disabled={isDeleting === client.id}
                        >
                          {isDeleting === client.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {showFormModal && (
        <ClientFormModal
          businessId={business.id}
          client={editingClient}
          onClose={() => {
            setShowFormModal(false);
            setEditingClient(null);
          }}
          onSave={handleClientSaved}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ErrorMessage } from '../ui/ErrorMessage';
import { WhatsAppIcon } from '../common/WhatsAppIcon';

interface EmployeeEditModalProps {
    employee: Employee | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedEmployee: Employee) => void;
    error: string | null;
    setError: (error: string | null) => void;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ employee, isOpen, onClose, onSave, error, setError }) => {
    const [editedName, setEditedName] = useState(employee?.name || '');
    const [editedAvatarUrl, setEditedAvatarUrl] = useState(employee?.avatarUrl || '');
    const [editedWhatsapp, setEditedWhatsapp] = useState(employee?.whatsapp || '');

    useEffect(() => {
        if (employee) {
            setEditedName(employee.name);
            setEditedAvatarUrl(employee.avatarUrl);
            setEditedWhatsapp(employee.whatsapp || '');
            setError(null); // Clear any previous errors when opening for a new employee
        }
    }, [employee, setError]);

    if (!isOpen) return null;

    const handleSave = () => {
        setError(null);
        if (!editedName.trim()) {
            setError('El nombre del empleado es obligatorio.');
            return;
        }
        if (employee) {
            onSave({
                ...employee,
                name: editedName,
                avatarUrl: editedAvatarUrl,
                whatsapp: editedWhatsapp?.trim() || undefined,
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold text-primary mb-4">Editar Empleado</h2>
                {error && <ErrorMessage message={error} />}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="employee-name" className="block text-sm font-medium text-secondary mb-1">Nombre</label>
                        <Input
                            id="employee-name"
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Nombre del empleado"
                        />
                    </div>
                    <div>
                        <label htmlFor="employee-avatar" className="block text-sm font-medium text-secondary mb-1">URL del Avatar</label>
                        <Input
                            id="employee-avatar"
                            type="text"
                            value={editedAvatarUrl}
                            onChange={(e) => setEditedAvatarUrl(e.target.value)}
                            placeholder="URL del avatar"
                        />
                    </div>
                    <div>
                        <label htmlFor="employee-whatsapp" className="block text-sm font-medium text-secondary mb-1 flex items-center gap-1">
                            <WhatsAppIcon className="w-4 h-4 mr-1 text-green-500" />
                            Número de WhatsApp <span className="ml-1 text-xs text-secondary">(opcional)</span>
                        </label>
                        <Input
                            id="employee-whatsapp"
                            type="tel"
                            value={editedWhatsapp}
                            onChange={e => setEditedWhatsapp(e.target.value)}
                            placeholder="+54 9 11 1234-5678"
                            icon={<WhatsAppIcon className="w-5 h-5 text-green-500" />}
                            autoComplete="off"
                        />
                        <p className="text-xs text-secondary mt-1 ml-1">Ejemplo: +54 9 11 1234-5678. Este campo es opcional y solo se usará para contacto rápido por WhatsApp.</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </div>
    );
};
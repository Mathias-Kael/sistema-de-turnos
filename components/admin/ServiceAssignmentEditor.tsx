import React, { useState, useEffect, memo, useCallback } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Service, Employee } from '../../types';

interface ServiceAssignmentEditorProps {
    service: Service;
    onClose: () => void;
}

const ServiceAssignmentEditor: React.FC<ServiceAssignmentEditorProps> = memo(({ service, onClose }) => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>(service.employeeIds || []);

    useEffect(() => {
        setAssignedEmployeeIds(service.employeeIds || []);
    }, [service.employeeIds]);

    const handleToggleEmployee = useCallback((employeeId: string) => {
        setAssignedEmployeeIds(prevIds => {
            if (prevIds.includes(employeeId)) {
                return prevIds.filter(id => id !== employeeId);
            } else {
                return [...prevIds, employeeId];
            }
        });
    }, []);

    const validateAssignments = (employeeIds: string[]): boolean => {
        if (employeeIds.length === 0) {
            alert('Debe asignar al menos un empleado al servicio');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateAssignments(assignedEmployeeIds)) {
            return;
        }
        try {
            const updatedServices = business.services.map(s =>
                s.id === service.id ? { ...s, employeeIds: assignedEmployeeIds } : s
            );
            // Asumiendo que dispatch puede ser asíncrono o que queremos simularlo
            // En un entorno real, la acción SET_SERVICES podría interactuar con un backend
            // y por lo tanto podría fallar.
            await new Promise(resolve => setTimeout(resolve, 100)); // Simular asincronía
            dispatch({ type: 'SET_SERVICES', payload: updatedServices });
            onClose();
        } catch (error) {
            console.error('Error al guardar asignaciones:', error);
            alert('Hubo un error al guardar las asignaciones. Inténtalo de nuevo.'); // Notificación de error simple
        }
    };

    return (
        <div
            role="dialog"
            aria-labelledby="service-assignment-title"
            className="fixed inset-0 bg-background-dark bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center"
        >
            <div className="bg-surface p-8 rounded-lg shadow-xl max-w-xl w-full text-primary">
                <h2 id="service-assignment-title" className="text-2xl font-bold mb-4 text-primary">
                    Asignar Empleados a {service.name}
                </h2>
                <div className="space-y-3">
                    {business.employees.length === 0 ? (
                        <p className="text-secondary">No hay empleados registrados. Por favor, añade empleados primero.</p>
                    ) : (
                        business.employees.map(employee => (
                            <div key={employee.id} className="flex items-center justify-between p-2 border border-default rounded-md bg-background">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={employee.avatarUrl || `https://ui-avatars.com/api/?name=${employee.name.replace(' ', '+')}&background=random`}
                                        alt={employee.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <span className="font-medium text-primary">{employee.name}</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={assignedEmployeeIds.includes(employee.id)}
                                    onChange={() => handleToggleEmployee(employee.id)}
                                    className="toggle toggle-primary"
                                />
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
                    <button onClick={handleSave} className="btn btn-primary">Guardar Asignaciones</button>
                </div>
            </div>
        </div>
    );
});

export default ServiceAssignmentEditor;
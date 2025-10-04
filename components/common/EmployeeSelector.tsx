import React from 'react';
import { Employee } from '../../types';
import { imageStorage } from '../../services/imageStorage';

interface EmployeeSelectorProps {
    employees: Employee[];
    selectedEmployeeId: string | 'any' | null;
    // FIX: Corrected the function type signature for the onSelectEmployee prop.
    // The previous syntax `(id: string | 'any') | null => void` was ambiguous.
    // The new signature `(id: string | 'any' | null) => void` correctly types the callback
    // to match the state setter from the parent component.
    onSelectEmployee: (id: string | 'any' | null) => void;
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({ employees, selectedEmployeeId, onSelectEmployee }) => {
    
    // Si no hay empleados elegibles, no mostrar nada.
    if (employees.length === 0) {
        return (
             <div className="p-4 border border-default rounded-lg bg-[color:var(--color-state-warning-bg)] text-[color:var(--color-state-warning-text)]">
                <p className="text-[color:var(--color-state-warning-text)]">No hay un único empleado que pueda realizar todos los servicios seleccionados. Por favor, ajusta tu selección.</p>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-primary">¿Con quién prefieres tu turno?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Opción "Cualquiera" */}
                <div
                    onClick={() => onSelectEmployee('any')}
                    className={`p-4 border rounded-lg cursor-pointer text-center transition-all duration-200 ${
                        selectedEmployeeId === 'any'
                            ? 'border-2 border-primary shadow-md bg-surface'
                            : 'bg-surface hover:shadow-sm border-default'
                    }`}
                >
                     <div className="font-bold text-primary">Cualquiera disponible</div>
                </div>

                {/* Opciones por empleado */}
                {employees.map(employee => {
                    const avatarUrl = employee.avatarUrl ? imageStorage.getImageUrl(employee.avatarUrl) : undefined;
                    return (
                        <div
                            key={employee.id}
                            onClick={() => onSelectEmployee(employee.id)}
                            className={`p-4 border rounded-lg cursor-pointer text-center transition-all duration-200 ${
                                selectedEmployeeId === employee.id
                                    ? 'border-2 border-primary shadow-md bg-surface'
                                    : 'bg-surface hover:shadow-sm border-default'
                            }`}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={employee.name}
                                    className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-background flex items-center justify-center text-secondary text-2xl">
                                    👤
                                </div>
                            )}
                            <div className="font-bold text-primary">{employee.name}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
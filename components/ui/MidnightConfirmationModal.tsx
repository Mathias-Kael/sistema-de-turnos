import React from 'react';
import { Button } from './Button';
import { calculateMidnightCrossingHours } from '../../utils/availability';

interface MidnightConfirmationModalProps {
    isOpen: boolean;
    interval: { open: string; close: string };
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Modal de confirmación para horarios que cruzan medianoche.
 * Previene errores comunes donde el admin podría haber querido configurar
 * un horario normal pero escribió mal la hora de cierre.
 */
export const MidnightConfirmationModal: React.FC<MidnightConfirmationModalProps> = ({
    isOpen,
    interval,
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    const totalHours = calculateMidnightCrossingHours(interval);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-surface border border-default rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                        <svg
                            className="w-6 h-6 text-yellow-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-primary">
                        Horario detectado cruza medianoche
                    </h3>
                </div>

                <div className="mb-6 space-y-3">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <p className="text-sm text-gray-700">
                            <span className="font-semibold">Configuraste:</span>{' '}
                            {interval.open} - {interval.close}
                        </p>
                    </div>

                    <div className="text-sm text-secondary space-y-2">
                        <p className="font-medium text-primary">Esto significa:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>
                                Abierto <span className="font-semibold">{totalHours.toFixed(1)} horas</span> ({interval.open}-{interval.close})
                            </li>
                            <li>El horario cruza al día siguiente</li>
                            <li>Los clientes pueden reservar en la madrugada</li>
                        </ul>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <p className="text-xs text-gray-600">
                            <span className="font-semibold">Ejemplo:</span> Si configuraste 22:00 - 02:00,
                            el negocio estará abierto desde las 22:00 de hoy hasta las 02:00 de mañana.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        Corregir
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="flex-1"
                    >
                        Sí, abierto hasta madrugada
                    </Button>
                </div>
            </div>
        </div>
    );
};

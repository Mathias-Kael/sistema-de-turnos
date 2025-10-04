import React from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { Service } from '../../types';
import { formatDuration } from '../../utils/format';

interface ServiceSelectorProps {
    selectedServices: Service[];
    onServiceChange: (service: Service) => void;
    // Opcional: permitir pasar servicios directamente (para ClientView sin contexto)
    servicesOverride?: Service[];
}

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-secondary" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2a3 3 0 00-3 3v1H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-1V5a3 3 0 00-3-3zm-1 4V5a1 1 0 012 0v1H9z" clipRule="evenodd" />
    </svg>
);


export const ServiceSelector: React.FC<ServiceSelectorProps> = ({ selectedServices, onServiceChange, servicesOverride }) => {
    const context = useBusinessState();
    const services = servicesOverride ?? context.services;

    const selectedIds = new Set(selectedServices.map(s => s.id));

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-primary">Elige tus servicios</h2>
            <div className="space-y-3">
                {services.map(service => (
                    <div
                        key={service.id}
                        onClick={() => onServiceChange(service)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedIds.has(service.id)
                                ? 'border-2 border-primary shadow-md bg-surface'
                                : 'bg-surface hover:shadow-sm border-default'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center">
                                <h3 className="font-bold text-primary">{service.name}</h3>
                                {service.requiresDeposit && <LockIcon />}
                            </div>
                            <div className="flex items-center flex-shrink-0 ml-4">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(service.id)}
                                    readOnly
                                    className="h-5 w-5 rounded focus:ring-0 accent-primary"
                                />
                            </div>
                        </div>
                         <p className="text-sm mt-1 text-secondary">{service.description}</p>
                        <div className="text-sm mt-2 text-secondary">
                            <span>{formatDuration(service.duration)}</span>
                            <span className="mx-2">&bull;</span>
                            <span>${service.price}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
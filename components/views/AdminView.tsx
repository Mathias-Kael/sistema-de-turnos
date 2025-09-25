import React, { useState } from 'react';
import { BrandingEditor } from '../admin/BrandingEditor';
import { ServicesEditor } from '../admin/ServicesEditor';
import { HoursEditor } from '../admin/HoursEditor';
import { EmployeesEditor } from '../admin/EmployeesEditor';
import { SharePanel } from '../admin/SharePanel';
import { ReservationsManager } from '../admin/ReservationsManager';
import { useBusinessState } from '../../context/BusinessContext';
import { ClientView } from './ClientView';

type Tab = 'info' | 'services' | 'employees' | 'hours' | 'share' | 'reservations' | 'preview';

export const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const { name, logoUrl } = useBusinessState();

    const renderContent = () => {
        switch (activeTab) {
            case 'info': return <BrandingEditor />;
            case 'services': return <ServicesEditor />;
            case 'employees': return <EmployeesEditor />;
            case 'hours': return <HoursEditor />;
            case 'share': return <SharePanel />;
            case 'reservations': return <ReservationsManager />;
            case 'preview': return <div className="border-default rounded-lg p-2 bg-background"><ClientView /></div>;
            default: return null;
        }
    };

    const TabButton: React.FC<{ tab: Tab; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors w-full text-left ${
                activeTab === tab ? 'bg-primary text-white' : 'hover:bg-surface-hover'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-background text-primary">
            <header className="bg-surface shadow-sm border-b border-default">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        {logoUrl && <img src={logoUrl} alt="logo" className="h-10 w-10 rounded-full object-cover" />}
                        <h1 className="text-xl font-bold">{name}</h1>
                    </div>
                    <a href="/?token=preview" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        Abrir vista de cliente
                    </a>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                    <aside className="lg:col-span-3 xl:col-span-2">
                        <nav className="flex flex-col space-y-2">
                           <TabButton tab="info" label="Info y Estilo" />
                           <TabButton tab="services" label="Servicios" />
                           <TabButton tab="employees" label="Empleados" />
                           <TabButton tab="hours" label="Horarios" />
                           <TabButton tab="reservations" label="Reservas" />
                           <TabButton tab="share" label="Compartir" />
                           <TabButton tab="preview" label="Vista Previa" />
                        </nav>
                    </aside>

                    <div className="lg:col-span-9 xl:col-span-10 mt-6 lg:mt-0">
                        <div className="bg-surface p-6 rounded-lg shadow">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

import React from 'react';
import { BrandingEditor } from '../admin/BrandingEditor';
import { ServicesEditor } from '../admin/ServicesEditor';
import { HoursEditor } from '../admin/HoursEditor';
import { EmployeesEditor } from '../admin/EmployeesEditor';
import { SharePanel } from '../admin/SharePanel';
import { ReservationsManager } from '../admin/ReservationsManager';
import { useBusinessState } from '../../context/BusinessContext';
import { ClientView } from './ClientView';
import { useAdminTabs } from '../../hooks/useAdminTabs';

export const AdminView: React.FC = () => {
    const { activeTab, setActiveTab, tabs } = useAdminTabs('info');
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

    const TabButton: React.FC<{ tab: typeof tabs[number]['id']; label: string }> = ({ tab, label }) => {
        const isActive = activeTab === tab;
        return (
            <button
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors w-full text-left ${
                    isActive ? 'bg-primary text-brand-text' : 'hover:bg-surface-hover'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-background text-primary">
            <header className="bg-surface shadow-sm border-b border-default sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {logoUrl && <img src={logoUrl} alt="logo" className="h-10 w-10 rounded-full object-cover" />}
                        <h1 className="text-xl font-bold">{name}</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                    <aside className="lg:col-span-3 xl:col-span-2">
                                                <nav className="flex flex-col space-y-2">
                                                    {tabs.map(t => (
                                                        <TabButton key={t.id} tab={t.id} label={t.label} />
                                                    ))}
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

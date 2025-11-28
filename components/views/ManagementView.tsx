import React, { useState } from 'react';
import { Wrench, Folder, Users, Clock, Palette, User } from 'lucide-react';
import { ServicesEditor } from '../admin/ServicesEditor';
import { CategoryManager } from '../admin/CategoryManager';
import { EmployeesEditor } from '../admin/EmployeesEditor';
import { HoursEditor } from '../admin/HoursEditor';
import { BrandingEditor } from '../admin/BrandingEditor';
import { ClientList } from '../admin/ClientList';
import { SecondaryText } from '../ui';

type ManagementSection = 'services' | 'categories' | 'team' | 'hours' | 'branding' | 'clients';

const sections: { id: ManagementSection; title: string; icon: React.ElementType; description: string }[] = [
    { id: 'team', title: 'Equipo', icon: Users, description: 'Gestiona tus empleados' },
    { id: 'categories', title: 'Categorías', icon: Folder, description: 'Agrupa tus servicios' },
    { id: 'services', title: 'Servicios', icon: Wrench, description: 'Crea y edita tus servicios' },
    { id: 'hours', title: 'Horarios', icon: Clock, description: 'Define tu disponibilidad' },
    { id: 'branding', title: 'Branding', icon: Palette, description: 'Personaliza tu página' },
    { id: 'clients', title: 'Clientes', icon: User, description: 'Administra tus clientes' },
];

const ManagementCard: React.FC<{ title: string; icon: React.ElementType; description: string; onClick: () => void }> = ({ title, icon: Icon, description, onClick }) => (
    <button onClick={onClick} className="bg-surface p-6 rounded-lg shadow-md border border-default text-left w-full hover:border-primary transition-all">
        <Icon className="h-8 w-8 mb-2 text-primary" />
        <h3 className="text-lg font-bold text-primary">{title}</h3>
        <SecondaryText>{description}</SecondaryText>
    </button>
);

export const ManagementView: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ManagementSection | null>(null);

    const renderActiveSection = () => {
        if (!activeSection) return null;

        switch (activeSection) {
            case 'services': return <ServicesEditor />;
            case 'categories': return <CategoryManager />;
            case 'team': return <EmployeesEditor />;
            case 'hours': return <HoursEditor />;
            case 'branding': return <BrandingEditor />;
            case 'clients': return <ClientList />;
            default: return null;
        }
    };

    if (activeSection) {
        const currentSection = sections.find(s => s.id === activeSection);
        return (
            <div className="p-4 sm:p-6 pb-20"> {/* Padding bottom para el footer fijo */}
                <h2 className="text-2xl font-bold text-primary mb-4">{currentSection?.title}</h2>
                <div className="bg-surface p-6 rounded-lg shadow border border-default">
                    {renderActiveSection()}
                </div>

                {/* Back button in footer for all screen sizes */}
                <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-default p-4">
                    <button onClick={() => setActiveSection(null)} className="w-full text-center text-primary font-bold">
                        &larr; Volver a Gestión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">Gestión del Negocio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sections.map(section => (
                    <ManagementCard
                        key={section.id}
                        {...section}
                        onClick={() => setActiveSection(section.id)}
                    />
                ))}
            </div>
        </div>
    );
};
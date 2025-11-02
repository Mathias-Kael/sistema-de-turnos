import React, { useMemo, useState } from 'react';
import { Service, Category, CategoryIcon as CategoryIconType } from '../../types';
import { formatDuration } from '../../utils/format';

interface ServiceSelectorProps {
    selectedServices: Service[];
    onServiceChange: (service: Service) => void;
    services: Service[];
    categories?: Category[]; // Opcional: para vistas públicas sin context
}

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-secondary" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2a3 3 0 00-3 3v1H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-1V5a3 3 0 00-3-3zm-1 4V5a1 1 0 012 0v1H9z" clipRule="evenodd" />
    </svg>
);

const ChevronIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={2.5} 
        stroke="currentColor" 
        className={`w-6 h-6 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'} ${className || ''}`}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

// Función helper para mapear CategoryIconType a SVG
const getCategoryIconSVG = (iconType?: CategoryIconType) => {
    // Si es 'none' o undefined, no mostrar ícono
    if (!iconType || iconType === 'none') {
        return null;
    }
    
    switch (iconType) {
        case 'star': // Premium / Destacado
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
            );
        
        case 'trophy': // Deportes / Competencias
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
            );
        
        case 'heart': // Spa / Masajes
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
            );
        
        case 'home': // Salones / Espacios
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            );
        
        case 'cake': // Eventos / Celebraciones
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                </svg>
            );
        
        case 'calendar': // Reservas / Agendamiento
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                </svg>
            );
        
        case 'eye': // Pestañas / Cejas
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            );
        
        case 'brush': // Maquillaje / Belleza
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
            );
        
        case 'academic': // Educación / Cursos
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
            );
        
        case 'briefcase': // Profesional / Negocios
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
            );
        
        case 'music': // Música / Entretenimiento
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
            );
        
        default:
            // Para cualquier valor desconocido o legacy, no mostrar ícono
            return null;
    }
};

const CategoryIconComponent: React.FC<{ icon?: CategoryIconType; visualState: 'closed' | 'open' | 'selected' }> = ({ icon, visualState }) => {
    const colorClass = {
        closed: 'text-primary',
        open: 'text-primary/60',
        selected: 'text-brand-text'
    }[visualState];
    
    return (
        <div className={`transition-all duration-300 ${colorClass}`}>
            {getCategoryIconSVG(icon)}
        </div>
    );
};

interface ServiceGroup {
    categoryId: string | null;
    categoryName: string;
    categoryIcon?: CategoryIconType;
    services: Service[];
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({ 
    selectedServices, 
    onServiceChange, 
    services,
    categories = [] // Default: array vacío para vistas sin categorías
}) => {
    const selectedIds = new Set(selectedServices.map(s => s.id));
    
    // Estado para acordeón: solo una categoría abierta a la vez
    const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

    // Agrupar servicios por categorías
    const serviceGroups = useMemo((): ServiceGroup[] => {
        const groups: ServiceGroup[] = [];
        const categorizedServiceIds = new Set<string>();

        // Primero, crear grupos para cada categoría que tenga servicios
        if (categories && categories.length > 0) {
            categories.forEach(category => {
                const categoryServices = services.filter(s => 
                    s.categoryIds?.includes(category.id)
                );
                
                if (categoryServices.length > 0) {
                    groups.push({
                        categoryId: category.id,
                        categoryName: category.name,
                        categoryIcon: category.icon,
                        services: categoryServices,
                    });
                    
                    // Marcar estos servicios como categorizados
                    categoryServices.forEach(s => categorizedServiceIds.add(s.id));
                }
            });
        }

        // Servicios sin categoría
        const uncategorizedServices = services.filter(s => 
            !categorizedServiceIds.has(s.id)
        );
        
        if (uncategorizedServices.length > 0) {
            groups.push({
                categoryId: null,
                categoryName: 'Otros Servicios',
                categoryIcon: undefined, // Sin ícono para servicios sin categoría
                services: uncategorizedServices,
            });
        }

        return groups;
    }, [services, categories]);

    // Calcular si una categoría tiene servicios seleccionados
    const getCategorySelectedCount = (group: ServiceGroup): number => {
        return group.services.filter(s => selectedIds.has(s.id)).length;
    };

    const toggleCategory = (categoryId: string | null) => {
        const id = categoryId || 'uncategorized';
        setOpenCategoryId(openCategoryId === id ? null : id);
    };

    const renderService = (service: Service) => {
        const isSelected = selectedIds.has(service.id);
        
        return (
            <div
                key={service.id}
                onClick={() => onServiceChange(service)}
                className={`relative overflow-hidden p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                    isSelected
                        ? 'border-primary shadow-xl bg-gradient-to-br from-surface via-background to-surface scale-[1.01]'
                        : 'bg-background hover:shadow-lg border-default hover:border-primary/50'
                }`}
            >
                {/* Ripple effect overlay cuando está seleccionado */}
                {isSelected && (
                    <div 
                        className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse pointer-events-none"
                        style={{ animationDuration: '2s' }}
                    />
                )}
                
                <div className="relative z-10 flex justify-between items-start">
                    <div className="flex items-center flex-1 min-w-0">
                        <h3 className={`font-bold truncate transition-colors ${
                            isSelected ? 'text-primary' : 'text-primary'
                        }`}>
                            {service.name}
                        </h3>
                        {service.requiresDeposit && <LockIcon />}
                    </div>
                    <div className="flex items-center flex-shrink-0 ml-4">
                        {/* Custom Checkbox Premium */}
                        <div className={`relative w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                            isSelected 
                                ? 'bg-primary border-primary shadow-lg shadow-primary/30 scale-110' 
                                : 'border-default bg-background hover:border-primary/50 hover:scale-105'
                        }`}>
                            {isSelected && (
                                <svg 
                                    className="w-4 h-4 text-brand-text animate-in zoom-in duration-200" 
                                    fill="none" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="3" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path d="M5 13l4 4L19 7"></path>
                                </svg>
                            )}
                        </div>
                    </div>
                </div>
                <p className={`relative z-10 text-sm mt-2 line-clamp-2 transition-colors ${
                    isSelected ? 'text-secondary' : 'text-secondary'
                }`}>
                    {service.description}
                </p>
                <div className={`relative z-10 text-sm mt-3 font-semibold flex items-center gap-2 ${
                    isSelected ? 'text-primary' : 'text-secondary'
                }`}>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-surface">
                        {formatDuration(service.duration)}
                    </span>
                    <span>•</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg font-bold ${
                        isSelected ? 'bg-primary text-brand-text' : 'bg-surface text-primary'
                    }`}>
                        ${service.price}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-2xl font-extrabold mb-8 text-primary bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Elige tus servicios
            </h2>
            
            {serviceGroups.length === 0 ? (
                <p className="text-secondary text-center py-12">No hay servicios disponibles</p>
            ) : categories && categories.length > 0 ? (
                // Vista con categorías: Accordion cards premium
                <div className="space-y-5">
                    {serviceGroups.map(group => {
                        const categoryKey = group.categoryId || 'uncategorized';
                        const isOpen = openCategoryId === categoryKey;
                        const selectedCount = getCategorySelectedCount(group);
                        const hasSelections = selectedCount > 0;
                        
                        // Determinar estado visual: closed | open | selected
                        const visualState = isOpen 
                            ? (hasSelections ? 'selected' : 'open')
                            : 'closed';

                        // Clases según estado (con soporte dark mode)
                        const borderClass = {
                            closed: 'border-gray-200 dark:border-gray-600 hover:border-primary/40 dark:hover:border-primary/50',
                            open: 'border-primary/40 dark:border-primary/60',
                            selected: 'border-primary'
                        }[visualState];

                        const shadowClass = {
                            closed: 'hover:shadow-md',
                            open: 'shadow-md',
                            selected: 'shadow-xl'
                        }[visualState];

                        // Background con soporte dark mode mejorado para estado 'open'
                        const bgClass = {
                            closed: '',
                            open: 'bg-surface dark:bg-primary/10',
                            selected: ''
                        }[visualState];

                        const bgStyle = visualState === 'selected'
                            ? 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 50%, var(--color-surface) 100%)'
                            : 'transparent';

                        return (
                            <div
                                key={categoryKey}
                                className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden transform hover:scale-[1.01] ${borderClass} ${shadowClass} ${bgClass}`}
                                style={{
                                    background: visualState === 'selected' ? bgStyle : undefined
                                }}
                            >
                                {/* Category Header Premium - Clickeable */}
                                <button
                                    onClick={() => toggleCategory(group.categoryId)}
                                    className={`w-full px-6 py-5 flex items-center justify-between transition-all duration-200 group ${
                                        visualState === 'selected' 
                                            ? 'bg-gradient-to-r from-transparent via-surface/30 to-transparent' 
                                            : visualState === 'open'
                                            ? 'bg-surface/20 dark:bg-primary/5'
                                            : 'hover:bg-surface/50 dark:hover:bg-surface/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {/* Icon Container con efecto elevation */}
                                        <div className={`p-3 rounded-xl transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110 ${
                                            visualState === 'selected'
                                                ? 'bg-primary shadow-primary/30' 
                                                : visualState === 'open'
                                                ? 'bg-surface dark:bg-primary/15 shadow-default/20'
                                                : 'bg-surface shadow-default/10 group-hover:bg-surface'
                                        }`}>
                                            <CategoryIconComponent 
                                                icon={group.categoryIcon} 
                                                visualState={visualState}
                                            />
                                        </div>
                                        
                                        {/* Text Content */}
                                        <div className="flex-1 min-w-0 text-left">
                                            <h3 className={`font-extrabold text-lg truncate transition-colors ${
                                                hasSelections ? 'text-primary' : 'text-primary group-hover:text-primary'
                                            }`}>
                                                {group.categoryName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-sm text-secondary font-medium">
                                                    {group.services.length} {group.services.length === 1 ? 'servicio' : 'servicios'}
                                                </span>
                                                {hasSelections && (
                                                    <>
                                                        <span className="text-secondary">•</span>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                                                            hasSelections 
                                                                ? 'bg-primary text-brand-text shadow-md' 
                                                                : 'bg-surface text-secondary'
                                                        }`}>
                                                            {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Chevron Icon */}
                                    <ChevronIcon isOpen={isOpen} className="text-primary flex-shrink-0 ml-4 group-hover:text-primary" />
                                </button>

                                {/* Services List - Collapsible con animación suave */}
                                <div
                                    className={`transition-all duration-300 ease-in-out ${
                                        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                                    style={{ overflow: isOpen ? 'visible' : 'hidden' }}
                                >
                                    <div className="px-6 pb-6 pt-2 space-y-3">
                                        {group.services.map(renderService)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // Vista sin categorías: Lista tradicional
                <div className="space-y-3">
                    {services.map(renderService)}
                </div>
            )}
        </div>
    );
};
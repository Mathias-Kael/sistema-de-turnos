import React, { useState } from 'react';
import { Employee } from '../../types';
import { imageStorage } from '../../services/imageStorage';
import { ImageZoomModal } from './ImageZoomModal';

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
    const [zoomImageData, setZoomImageData] = useState<{ url: string; alt: string } | null>(null);

    const handleImageClick = (e: React.MouseEvent, avatarUrl: string, name: string) => {
        console.log('[EmployeeSelector] 🖱️ Click en imagen de empleado:', name);
        e.stopPropagation();
        const imageUrl = imageStorage.getImageUrl(avatarUrl);
        console.log('[EmployeeSelector] 🖼️ URL de imagen:', imageUrl);
        setZoomImageData({ url: imageUrl, alt: name });
        console.log('[EmployeeSelector] ✅ zoomImageData seteado, debería abrir modal');
    };
    
    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-primary">¿Con quién prefieres tu turno?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Opción "Cualquiera" */}
                <div
                    onClick={() => onSelectEmployee('any')}
                    className={`p-5 md:p-6 border rounded-2xl cursor-pointer text-center transition-all duration-200 flex flex-col items-center justify-center aspect-square ${
                        selectedEmployeeId === 'any'
                            ? 'border-2 border-primary shadow-lg bg-surface'
                            : 'bg-surface hover:shadow-md border-default'
                    }`}
                >
                     <div className="text-lg md:text-xl font-bold text-primary leading-snug">Cualquiera<br className="hidden md:block"/> disponible</div>
                     <div className="mt-2 text-[10px] md:text-xs text-secondary max-w-[8rem] md:max-w-[9rem] leading-tight">
                        Te asignaremos automáticamente quien esté libre.
                     </div>
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
                                    onClick={(e) => handleImageClick(e, employee.avatarUrl!, employee.name)}
                                    /* Tamaños anteriores: w-20 (80px) / md:w-24 (96px)
                                       Requerido: >=96px móvil y >=128px desktop.
                                       Elegimos w-24 (96px) móvil y md:w-32 (128px) desktop para cumplir claramente. */
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-full mx-auto mb-3 object-cover shadow-md cursor-zoom-in hover:opacity-90 transition-opacity"
                                />
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full mx-auto mb-3 bg-background flex items-center justify-center text-secondary text-4xl shadow-inner">
                                    👤
                                </div>
                            )}
                            <div className="font-bold text-primary text-sm md:text-base leading-tight">{employee.name}</div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de zoom de imagen */}
            {zoomImageData && (
                <>
                    {console.log('[EmployeeSelector] 🎬 Renderizando ImageZoomModal con data:', zoomImageData)}
                    <ImageZoomModal
                        imageUrl={zoomImageData.url}
                        altText={zoomImageData.alt}
                        onClose={() => {
                            console.log('[EmployeeSelector] ❌ Cerrando ImageZoomModal');
                            setZoomImageData(null);
                        }}
                    />
                </>
            )}
        </div>
    );
};
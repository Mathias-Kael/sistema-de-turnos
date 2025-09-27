import React, { createContext, useReducer, useContext, Dispatch, useEffect, useState, useMemo } from 'react';
import { Business, Service, Branding, Hours, Employee } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { mockBackend } from '../services/mockBackend';

// --- Tipos de Acción ---
type Action =
    | { type: 'HYDRATE_STATE'; payload: Business }
    | { type: 'UPDATE_BUSINESS'; payload: Business };

// --- Contextos ---
const BusinessStateContext = createContext<Business | undefined>(undefined);
// El dispatch ahora puede manejar promesas para operaciones asíncronas
const BusinessDispatchContext = createContext<((action: Action) => Promise<void>) | undefined>(undefined);

// --- Reducer (sólo maneja el estado síncrono) ---
const businessReducer = (state: Business, action: Action): Business => {
    switch (action.type) {
        case 'HYDRATE_STATE':
        case 'UPDATE_BUSINESS':
            return { ...state, ...action.payload };
        default:
            return state;
    }
};

// --- Provider ---
export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(businessReducer, INITIAL_BUSINESS_DATA);
    const [isLoaded, setIsLoaded] = useState(false);

    // Carga inicial de datos
    useEffect(() => {
        const init = async () => {
            try {
                const initialData = await mockBackend.getBusinessData();
                dispatch({ type: 'HYDRATE_STATE', payload: initialData });
            } catch (error) {
                console.error("Failed to load initial business data", error);
                // Opcional: podrías querer un estado de error global aquí
            } finally {
                setIsLoaded(true);
            }
        };
        init();
    }, []);

    // Wrapper asíncrono para el dispatch que interactúa con el backend
    const asyncDispatch = async (action: Action) => {
        switch (action.type) {
            case 'UPDATE_BUSINESS':
                // Llama al backend primero. Si falla, lanza un error.
                const updatedData = await mockBackend.updateBusinessData(action.payload);
                // Si tiene éxito, actualiza el estado de la UI.
                dispatch({ type: 'UPDATE_BUSINESS', payload: updatedData });
                break;
            // Otros casos asíncronos (como ADD_EMPLOYEE, etc.) irían aquí
            default:
                // Las acciones síncronas simplemente pasan por el reducer
                dispatch(action);
        }
    };
    
    const memoizedBusinessData = useMemo(() => ({
        ...state,
    }), [state]);

    if (!isLoaded) {
        // Podrías mostrar un spinner de carga global aquí
        return <div>Cargando negocio...</div>;
    }

    return (
        <BusinessStateContext.Provider value={memoizedBusinessData}>
            <BusinessDispatchContext.Provider value={asyncDispatch}>
                {children}
            </BusinessDispatchContext.Provider>
        </BusinessStateContext.Provider>
    );
};

// --- Hooks de conveniencia ---
export const useBusinessState = () => {
    const context = useContext(BusinessStateContext);
    if (context === undefined) {
        throw new Error('useBusinessState must be used within a BusinessProvider');
    }
    return context;
};

export const useBusinessDispatch = () => {
    const context = useContext(BusinessDispatchContext);
    if (context === undefined) {
        throw new Error('useBusinessDispatch must be used within a BusinessProvider');
    }
    return context;
};

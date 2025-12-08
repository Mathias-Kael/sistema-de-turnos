import React, { createContext, useReducer, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { Business, Service, Branding, Hours, Employee, Booking, Category } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { supabaseBackend as prodBackend } from '../services/supabaseBackend';
import { mockBackendTest } from '../services/mockBackend.e2e';
import { createBookingSafe } from '../services/api';
import { normalizeBusinessData } from '../utils/availability';

// --- Tipos de Acción ---
type Action =
    | { type: 'HYDRATE_STATE'; payload: Business }
    | { type: 'UPDATE_BUSINESS'; payload: Business }
    | { type: 'SET_BUSINESS_INFO'; payload: { name: string; description: string } }
    | { type: 'SET_PHONE'; payload: string }
    | { type: 'SET_BRANDING'; payload: Branding }
    | { type: 'ADD_SERVICE'; payload: Service }
    | { type: 'UPDATE_SERVICE'; payload: Service }
    | { type: 'DELETE_SERVICE'; payload: string }
    | { type: 'SET_HOURS'; payload: Hours }
    | { type: 'ADD_EMPLOYEE'; payload: Employee }
    | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
    | { type: 'DELETE_EMPLOYEE'; payload: string }
    | { type: 'UPDATE_EMPLOYEE_HOURS'; payload: { employeeId: string; hours: Hours } }
    | { type: 'CREATE_BOOKING'; payload: Omit<Booking, 'id'> }
    | { type: 'UPDATE_BOOKING'; payload: Booking }
    | { type: 'UPDATE_BOOKING_STATUS'; payload: { bookingId: string; status: string; notes?: string } }
    | { type: 'DELETE_BOOKING'; payload: string }
    | { type: 'SET_COVER_IMAGE'; payload: string }
    | { type: 'SET_PROFILE_IMAGE'; payload: string }
    | { type: 'UPDATE_SHARE_TOKEN'; payload: { shareToken: string; shareTokenStatus: string; shareTokenExpiresAt: string | null } }
    | { type: 'CREATE_CATEGORY'; payload: { name: string; icon: import('../types').CategoryIcon } }
    | { type: 'UPDATE_CATEGORY'; payload: { categoryId: string; name: string; icon: import('../types').CategoryIcon } }
    | { type: 'DELETE_CATEGORY'; payload: string }
    | { type: 'UPDATE_SERVICE_CATEGORIES'; payload: { serviceId: string; categoryIds: string[] } }
    | { type: 'UPDATE_RESOURCE_CONFIG'; payload: import('../types').ResourceTerminology };

// --- Contextos ---
const BusinessStateContext = createContext<Business | undefined>(undefined);
const BusinessDispatchContext = createContext<((action: Action) => Promise<void>) | undefined>(undefined);

// --- Reducer (sólo maneja el estado síncrono) ---
const businessReducer = (state: Business, action: Action): Business => {
    switch (action.type) {
        case 'HYDRATE_STATE':
        case 'UPDATE_BUSINESS':
            // Normalizar siempre antes de actualizar estado
            return normalizeBusinessData(action.payload);

        case 'UPDATE_SERVICE_CATEGORIES':
            return {
                ...state,
                services: state.services.map(service =>
                    service.id === action.payload.serviceId
                        ? { ...service, categoryIds: action.payload.categoryIds }
                        : service
                ),
            };

        default:
            return state;
    }
};

// --- Provider ---
export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(businessReducer, INITIAL_BUSINESS_DATA);
    const [isLoaded, setIsLoaded] = useState(false);
    const stateRef = useRef(state); // Referencia mutable al estado más reciente

    // Actualizar la referencia cada vez que el estado cambie
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const devMock = params.get('devMock') === '1';
        const backend = devMock ? mockBackendTest : prodBackend;
        (async () => {
            try {
                const initialData = await backend.getBusinessData();
                // El reducer normalizará automáticamente al despachar HYDRATE_STATE
                dispatch({ type: 'HYDRATE_STATE', payload: initialData });
            } catch (error) {
                console.error('Failed to load initial business data', error);
            } finally {
                setIsLoaded(true);
            }
        })();
    }, []);

    const asyncDispatch = async (action: Action) => {
        try {
            const currentState = stateRef.current;
            const params = new URLSearchParams(window.location.search);
            const devMock = params.get('devMock') === '1';
            const backend = devMock ? mockBackendTest : prodBackend;

            switch (action.type) {
                case 'UPDATE_BUSINESS':
                    const updatedBusiness = await backend.updateBusinessData(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
                    break;
                case 'ADD_SERVICE':
                    const updatedBusinessAfterAddService = await backend.addService(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterAddService });
                    break;
                case 'UPDATE_SERVICE':
                    const updatedBusinessAfterUpdateService = await backend.updateService(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterUpdateService });
                    break;
                case 'DELETE_SERVICE':
                    const updatedBusinessAfterDeleteService = await backend.deleteService(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterDeleteService });
                    break;
                case 'ADD_EMPLOYEE':
                    const updatedBusinessAfterAddEmployee = await backend.addEmployee(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterAddEmployee });
                    break;
                case 'UPDATE_EMPLOYEE':
                    const updatedBusinessAfterUpdateEmployee = await backend.updateEmployee(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterUpdateEmployee });
                    break;
                case 'DELETE_EMPLOYEE':
                    const updatedBusinessAfterDeleteEmployee = await backend.deleteEmployee(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterDeleteEmployee });
                    break;
                case 'UPDATE_EMPLOYEE_HOURS':
                    const employeeToUpdateHours = currentState.employees.find(e => e.id === action.payload.employeeId);
                    if (employeeToUpdateHours) {
                        const updatedBusinessAfterEmployeeHours = await backend.updateEmployee({ ...employeeToUpdateHours, hours: action.payload.hours });
                        dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterEmployeeHours });
                    }
                    break;
                case 'CREATE_BOOKING':
                    const { id: businessId } = currentState;
                    const { client, clientId, date, start, end, employeeId, services } = action.payload;

                    const bookingData = {
                        employee_id: employeeId,
                        date,
                        start_time: start,
                        end_time: end,
                        client_name: client.name,
                        client_phone: client.phone,
                        client_email: client.email, // ← NUEVO: Incluir email
                        client_id: clientId, // ← NUEVO: Incluir client_id si existe
                        business_id: businessId,
                        service_ids: services.map(s => s.id),
                    };

                    // Usar backend apropiado según el modo
                    if (devMock) {
                        // Mock backend maneja createBookingSafe internamente
                        const updatedBusinessAfterCreate = await backend.createBookingSafe(bookingData);
                        dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterCreate });
                    } else {
                        // Producción: usar RPC de Supabase directamente
                        await createBookingSafe(bookingData);
                        // Re-hidratar estado del negocio
                        const updatedBusinessAfterCreate = await backend.getBusinessData();
                        dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterCreate });
                    }
                    break;
                case 'UPDATE_BOOKING':
                    const updatedBusinessAfterUpdateBooking = await backend.updateBooking(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterUpdateBooking });
                    break;
                case 'UPDATE_BOOKING_STATUS':
                    {
                        const updatedBusinessAfterStatus = await backend.updateBookingStatus(
                            action.payload.bookingId,
                            action.payload.status,
                            currentState.id,
                            action.payload.notes
                        );
                        dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterStatus });
                    }
                    break;
                case 'DELETE_BOOKING':
                    const updatedBusinessAfterDeleteBooking = await backend.deleteBooking(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterDeleteBooking });
                    break;
                case 'SET_BUSINESS_INFO':
                    const updatedBusinessInfo = { ...currentState, name: action.payload.name, description: action.payload.description };
                    const updatedBusinessFromInfo = await backend.updateBusinessData(updatedBusinessInfo);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromInfo });
                    break;
                case 'SET_PHONE':
                    const updatedBusinessPhone = { ...currentState, phone: action.payload };
                    const updatedBusinessFromPhone = await backend.updateBusinessData(updatedBusinessPhone);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromPhone });
                    break;
                case 'SET_BRANDING':
                    const updatedBusinessBranding = { ...currentState, branding: action.payload };
                    const updatedBusinessFromBranding = await backend.updateBusinessData(updatedBusinessBranding);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromBranding });
                    break;
                case 'SET_HOURS':
                    const updatedBusinessHours = { ...currentState, hours: action.payload };
                    const updatedBusinessFromHours = await backend.updateBusinessData(updatedBusinessHours);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromHours });
                    break;
                case 'SET_COVER_IMAGE':
                    {
                        const updatedWithCover = { ...currentState, coverImageUrl: action.payload };
                        const savedWithCover = await backend.updateBusinessData(updatedWithCover);
                        dispatch({ type: 'UPDATE_BUSINESS', payload: savedWithCover });
                    }
                    break;
                case 'SET_PROFILE_IMAGE':
                    {
                        const updatedWithProfile = { ...currentState, profileImageUrl: action.payload };
                        const savedWithProfile = await backend.updateBusinessData(updatedWithProfile);
                        dispatch({ type: 'UPDATE_BUSINESS', payload: savedWithProfile });
                    }
                    break;
                case 'UPDATE_SHARE_TOKEN':
                    {
                        const updatedWithToken = {
                            ...currentState,
                            shareToken: action.payload.shareToken,
                            shareTokenStatus: action.payload.shareTokenStatus as 'active' | 'paused' | 'revoked',
                            shareTokenExpiresAt: action.payload.shareTokenExpiresAt,
                        };
                        const savedWithToken = await backend.updateBusinessData(updatedWithToken);
                        dispatch({ type: 'UPDATE_BUSINESS', payload: savedWithToken });
                    }
                    break;
                case 'CREATE_CATEGORY':
                    const updatedBusinessAfterCreateCategory = await backend.createCategory(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterCreateCategory });
                    break;
                case 'UPDATE_CATEGORY':
                    const updatedBusinessAfterUpdateCategory = await backend.updateCategory(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterUpdateCategory });
                    break;
                case 'DELETE_CATEGORY':
                    const updatedBusinessAfterDeleteCategory = await backend.deleteCategory(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterDeleteCategory });
                    break;
                case 'UPDATE_SERVICE_CATEGORIES':
                    {
                        const { serviceId, categoryIds } = action.payload;
                        // Llamada a la nueva función del backend
                        const updatedCategoryIds = await backend.updateServiceCategories(serviceId, categoryIds);
                        
                        // Actualización optimista del estado local usando el reducer
                        dispatch({
                            type: 'UPDATE_SERVICE_CATEGORIES',
                            payload: { serviceId, categoryIds: updatedCategoryIds },
                        });
                    }
                    break;
                case 'UPDATE_RESOURCE_CONFIG':
                    const updatedBusinessAfterResourceConfig = await backend.updateResourceTerminology(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterResourceConfig });
                    break;
                default:
                    // Esta rama es para HYDRATE_STATE, que no necesita lógica asíncrona.
                    // El reducer se encarga de ello.
                    dispatch(action);
            }
        } catch (error) {
            console.error("Backend operation failed:", error);
            throw error;
        }
    };

    const memoizedBusinessData = useMemo(() => ({ ...state }), [state]);

    if (!isLoaded) {
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

// --- Hooks ---
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

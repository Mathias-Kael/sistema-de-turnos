import React, { createContext, useReducer, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { Business, Service, Branding, Hours, Employee, Booking } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { mockBackend } from '../services/mockBackend';

// --- Tipos de Acción ---
type Action =
    | { type: 'HYDRATE_STATE'; payload: Business }
    | { type: 'UPDATE_BUSINESS'; payload: Business }
    | { type: 'SET_BUSINESS_INFO'; payload: { name: string; description: string; logoUrl: string } }
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
    | { type: 'DELETE_BOOKING'; payload: string };

// --- Contextos ---
const BusinessStateContext = createContext<Business | undefined>(undefined);
const BusinessDispatchContext = createContext<((action: Action) => Promise<void>) | undefined>(undefined);

// --- Reducer (sólo maneja el estado síncrono) ---
const businessReducer = (state: Business, action: Action): Business => {
    switch (action.type) {
        case 'HYDRATE_STATE':
        case 'UPDATE_BUSINESS':
            return action.payload;
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
        const init = async () => {
            try {
                const initialData = await mockBackend.getBusinessData();
                dispatch({ type: 'HYDRATE_STATE', payload: initialData });
            } catch (error) {
                console.error("Failed to load initial business data", error);
            } finally {
                setIsLoaded(true);
            }
        };
        init();
    }, []);

    const asyncDispatch = async (action: Action) => {
        try {
            const currentState = stateRef.current;

            switch (action.type) {
                case 'UPDATE_BUSINESS':
                    const updatedBusiness = await mockBackend.updateBusinessData(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
                    break;
                case 'ADD_SERVICE':
                    const updatedBusinessAfterAddService = await mockBackend.addService(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterAddService });
                    break;
                case 'UPDATE_SERVICE':
                    const updatedBusinessAfterUpdateService = await mockBackend.updateService(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterUpdateService });
                    break;
                case 'DELETE_SERVICE':
                    const updatedBusinessAfterDeleteService = await mockBackend.deleteService(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterDeleteService });
                    break;
                case 'ADD_EMPLOYEE':
                    const updatedBusinessAfterAddEmployee = await mockBackend.addEmployee(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterAddEmployee });
                    break;
                case 'UPDATE_EMPLOYEE':
                    const updatedBusinessAfterUpdateEmployee = await mockBackend.updateEmployee(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterUpdateEmployee });
                    break;
                case 'DELETE_EMPLOYEE':
                    const updatedBusinessAfterDeleteEmployee = await mockBackend.deleteEmployee(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterDeleteEmployee });
                    break;
                case 'UPDATE_EMPLOYEE_HOURS':
                    const employeeToUpdateHours = currentState.employees.find(e => e.id === action.payload.employeeId);
                    if (employeeToUpdateHours) {
                        const updatedBusinessAfterEmployeeHours = await mockBackend.updateEmployee({ ...employeeToUpdateHours, hours: action.payload.hours });
                        dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterEmployeeHours });
                    }
                    break;
                case 'CREATE_BOOKING':
                    const updatedBusinessAfterCreateBooking = await mockBackend.createBooking(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterCreateBooking });
                    break;
                case 'UPDATE_BOOKING':
                    const updatedBusinessAfterUpdateBooking = await mockBackend.updateBooking(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterUpdateBooking });
                    break;
                case 'DELETE_BOOKING':
                    const updatedBusinessAfterDeleteBooking = await mockBackend.deleteBooking(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessAfterDeleteBooking });
                    break;
                case 'SET_BUSINESS_INFO':
                    const updatedBusinessInfo = { ...currentState, name: action.payload.name, description: action.payload.description, logoUrl: action.payload.logoUrl };
                    const updatedBusinessFromInfo = await mockBackend.updateBusinessData(updatedBusinessInfo);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromInfo });
                    break;
                case 'SET_PHONE':
                    const updatedBusinessPhone = { ...currentState, phone: action.payload };
                    const updatedBusinessFromPhone = await mockBackend.updateBusinessData(updatedBusinessPhone);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromPhone });
                    break;
                case 'SET_BRANDING':
                    const updatedBusinessBranding = { ...currentState, branding: action.payload };
                    const updatedBusinessFromBranding = await mockBackend.updateBusinessData(updatedBusinessBranding);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromBranding });
                    break;
                case 'SET_HOURS':
                    const updatedBusinessHours = { ...currentState, hours: action.payload };
                    const updatedBusinessFromHours = await mockBackend.updateBusinessData(updatedBusinessHours);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusinessFromHours });
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

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
    | { type: 'SET_SERVICES'; payload: Service[] }
    | { type: 'ADD_SERVICE'; payload: Service }
    | { type: 'UPDATE_SERVICE'; payload: Service }
    | { type: 'DELETE_SERVICE'; payload: string }
    | { type: 'SET_HOURS'; payload: Hours }
    | { type: 'SET_EMPLOYEES'; payload: Employee[] }
    | { type: 'ADD_EMPLOYEE'; payload: Employee }
    | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
    | { type: 'DELETE_EMPLOYEE'; payload: string }
    | { type: 'UPDATE_EMPLOYEE_HOURS'; payload: { employeeId: string; hours: Hours } }
    | { type: 'CREATE_BOOKING'; payload: Booking }
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
            return { ...state, ...action.payload };
        case 'SET_BUSINESS_INFO':
            return { ...state, name: action.payload.name, description: action.payload.description, logoUrl: action.payload.logoUrl };
        case 'SET_PHONE':
            return { ...state, phone: action.payload };
        case 'SET_BRANDING':
            return { ...state, branding: action.payload };
        case 'SET_SERVICES':
            return { ...state, services: action.payload };
        case 'ADD_SERVICE':
            return { ...state, services: [...state.services, action.payload] };
        case 'UPDATE_SERVICE':
            return { ...state, services: state.services.map(s => s.id === action.payload.id ? action.payload : s) };
        case 'DELETE_SERVICE':
            return { ...state, services: state.services.filter(s => s.id !== action.payload) };
        case 'SET_HOURS':
            return { ...state, hours: action.payload };
        case 'SET_EMPLOYEES':
            return { ...state, employees: action.payload };
        case 'ADD_EMPLOYEE':
            return { ...state, employees: [...state.employees, action.payload] };
        case 'UPDATE_EMPLOYEE':
            return { ...state, employees: state.employees.map(emp => emp.id === action.payload.id ? action.payload : emp) };
        case 'DELETE_EMPLOYEE':
            return {
                ...state,
                employees: state.employees.filter(emp => emp.id !== action.payload),
                services: state.services.map(service => ({
                    ...service,
                    employeeIds: service.employeeIds.filter(id => id !== action.payload)
                }))
            };
        case 'UPDATE_EMPLOYEE_HOURS':
            return {
                ...state,
                employees: state.employees.map(emp =>
                    emp.id === action.payload.employeeId
                        ? { ...emp, hours: action.payload.hours }
                        : emp
                ),
            };
        case 'CREATE_BOOKING':
            return { ...state, bookings: [...state.bookings, action.payload] };
        case 'UPDATE_BOOKING':
            return { ...state, bookings: state.bookings.map(b => b.id === action.payload.id ? action.payload : b) };
        case 'DELETE_BOOKING':
            return { ...state, bookings: state.bookings.filter(b => b.id !== action.payload) };
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
            const currentState = stateRef.current; // Obtener el estado más reciente

            switch (action.type) {
                case 'UPDATE_BUSINESS':
                    const updatedBusiness = await mockBackend.updateBusinessData(action.payload);
                    dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
                    break;
                case 'ADD_SERVICE':
                    const addedService = await mockBackend.addService(action.payload);
                    dispatch({ type: 'ADD_SERVICE', payload: addedService });
                    break;
                case 'UPDATE_SERVICE':
                    const updatedService = await mockBackend.updateService(action.payload);
                    dispatch({ type: 'UPDATE_SERVICE', payload: updatedService });
                    break;
                case 'DELETE_SERVICE':
                    await mockBackend.deleteService(action.payload);
                    dispatch(action);
                    break;
                case 'ADD_EMPLOYEE':
                    const addedEmployee = await mockBackend.addEmployee(action.payload);
                    dispatch({ type: 'ADD_EMPLOYEE', payload: addedEmployee });
                    break;
                case 'UPDATE_EMPLOYEE':
                    const updatedEmployee = await mockBackend.updateEmployee(action.payload);
                    dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
                    break;
                case 'DELETE_EMPLOYEE':
                    await mockBackend.deleteEmployee(action.payload);
                    dispatch(action);
                    break;
                case 'UPDATE_EMPLOYEE_HOURS':
                    const employeeToUpdateHours = currentState.employees.find(e => e.id === action.payload.employeeId);
                    if (employeeToUpdateHours) {
                        const updatedEmp = await mockBackend.updateEmployee({ ...employeeToUpdateHours, hours: action.payload.hours });
                        dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmp });
                    }
                    break;
                case 'CREATE_BOOKING':
                    const createdBooking = await mockBackend.createBooking(action.payload);
                    dispatch({ type: 'CREATE_BOOKING', payload: createdBooking });
                    break;
                case 'UPDATE_BOOKING':
                    const updatedBooking = await mockBackend.updateBooking(action.payload);
                    dispatch({ type: 'UPDATE_BOOKING', payload: updatedBooking });
                    break;
                case 'DELETE_BOOKING':
                    await mockBackend.deleteBooking(action.payload);
                    dispatch(action);
                    break;
                // Acciones que actualizan el objeto Business completo
                case 'SET_HOURS':
                case 'SET_BUSINESS_INFO':
                case 'SET_PHONE':
                case 'SET_BRANDING':
                    const newState = businessReducer(currentState, action);
                    await mockBackend.updateBusinessData(newState);
                    dispatch(action);
                    break;
                default:
                    dispatch(action); // Para acciones puramente locales
            }
        } catch (error) {
            console.error("Backend operation failed:", error);
            throw error; // Re-lanzar para que el componente pueda manejarlo
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

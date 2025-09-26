import React, { createContext, useReducer, useContext, Dispatch, useEffect, useState } from 'react';
import { Business, Service, Branding, Hours, Employee } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { mockBackend } from '../services/mockBackend';

const loadInitialState = async (): Promise<Business> => {
  try {
    const data = await mockBackend.getBusinessData();
    return data;
  } catch (error) {
    console.error("Failed to load business data from mockBackend", error);
    return INITIAL_BUSINESS_DATA;
  }
};


type Action =
    | { type: 'SET_BUSINESS_INFO'; payload: { name: string; description: string; logoUrl: string } }
    | { type: 'SET_PHONE'; payload: string }
    | { type: 'SET_BRANDING'; payload: Branding }
    | { type: 'SET_SERVICES'; payload: Service[] }
    | { type: 'SET_HOURS'; payload: Hours }
    | { type: 'SET_EMPLOYEES'; payload: Employee[] }
    | { type: 'ADD_EMPLOYEE'; payload: Employee }
    | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
    | { type: 'DELETE_EMPLOYEE'; payload: string } // payload es el employeeId
    | { type: 'SET_EMPLOYEES_AND_SERVICES'; payload: { employees: Employee[], services: Service[] } };

const BusinessStateContext = createContext<Business | undefined>(undefined);
const BusinessDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

const businessReducer = (state: Business, action: Action): Business => {
    switch (action.type) {
        case 'SET_BUSINESS_INFO':
            return { ...state, name: action.payload.name, description: action.payload.description, logoUrl: action.payload.logoUrl };
        case 'SET_PHONE':
            return { ...state, phone: action.payload };
        case 'SET_BRANDING':
            return { ...state, branding: action.payload };
        case 'SET_SERVICES':
            return { ...state, services: action.payload };
        case 'SET_HOURS':
            return { ...state, hours: action.payload };
        case 'SET_EMPLOYEES':
            return { ...state, employees: action.payload };
        case 'ADD_EMPLOYEE':
            return { ...state, employees: [...state.employees, action.payload] };
        case 'UPDATE_EMPLOYEE':
            return {
                ...state,
                employees: state.employees.map(emp =>
                    emp.id === action.payload.id ? action.payload : emp
                ),
            };
        case 'DELETE_EMPLOYEE':
            return {
                ...state,
                employees: state.employees.filter(emp => emp.id !== action.payload),
                // También eliminar al empleado de los servicios si estaba asignado
                services: state.services.map(service => ({
                    ...service,
                    employeeIds: service.employeeIds.filter(id => id !== action.payload)
                }))
            };
        case 'SET_EMPLOYEES_AND_SERVICES':
            return { ...state, employees: action.payload.employees, services: action.payload.services };
        default:
            return state;
    }
};

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(businessReducer, INITIAL_BUSINESS_DATA);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const init = async () => {
            const initialData = await loadInitialState();
            // Dispatch actions to set the initial state from the backend
            dispatch({ type: 'SET_BUSINESS_INFO', payload: { name: initialData.name, description: initialData.description, logoUrl: initialData.logoUrl } });
            dispatch({ type: 'SET_PHONE', payload: initialData.phone });
            dispatch({ type: 'SET_BRANDING', payload: initialData.branding });
            dispatch({ type: 'SET_SERVICES', payload: initialData.services });
            dispatch({ type: 'SET_HOURS', payload: initialData.hours });
            dispatch({ type: 'SET_EMPLOYEES', payload: initialData.employees }); // Asegurarse de que los empleados se carguen
            setIsLoaded(true);
        };
        init();
    }, []);

    // Persist state to mockBackend whenever it changes
    useEffect(() => {
        if (isLoaded) {
            mockBackend.updateBusinessData(state).catch(error => {
                console.error("Failed to save business data to mockBackend", error);
            });
        }
    }, [state, isLoaded]);

    return (
        <BusinessStateContext.Provider value={state}>
            <BusinessDispatchContext.Provider value={dispatch}>
                {children}
            </BusinessDispatchContext.Provider>
        </BusinessStateContext.Provider>
    );
};

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

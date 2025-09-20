import React, { createContext, useReducer, useContext, Dispatch, useEffect } from 'react';
import { Business, Service, Branding, Hours, Employee } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';

const LOCAL_STORAGE_KEY = 'businessData';

const loadInitialState = (): Business => {
  try {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error("Failed to parse business data from localStorage", error);
  }
  return INITIAL_BUSINESS_DATA;
};


type Action =
    | { type: 'SET_BUSINESS_INFO'; payload: { name: string; description: string; logoUrl: string } }
    | { type: 'SET_PHONE'; payload: string }
    | { type: 'SET_BRANDING'; payload: Branding }
    | { type: 'SET_SERVICES'; payload: Service[] }
    | { type: 'SET_HOURS'; payload: Hours }
    // FIX: Add actions for employee management to avoid hacks in editor components.
    | { type: 'SET_EMPLOYEES'; payload: Employee[] }
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
        // FIX: Implement reducer cases for new employee actions.
        case 'SET_EMPLOYEES':
            return { ...state, employees: action.payload };
        case 'SET_EMPLOYEES_AND_SERVICES':
            return { ...state, employees: action.payload.employees, services: action.payload.services };
        default:
            return state;
    }
};

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(businessReducer, loadInitialState());

    // Persist state to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Failed to save business data to localStorage", error);
        }
    }, [state]);

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

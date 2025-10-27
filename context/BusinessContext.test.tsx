import React from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import { BusinessProvider, useBusinessState, useBusinessDispatch } from './BusinessContext';
import { supabaseBackend } from '../services/supabaseBackend';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { Employee } from '../types';

// Mock del backend para espiar sus métodos
jest.mock('../services/supabaseBackend');

const mockGetBusinessData = supabaseBackend.getBusinessData as jest.Mock;
const mockUpdateBusinessData = supabaseBackend.updateBusinessData as jest.Mock;
const mockAddEmployee = supabaseBackend.addEmployee as jest.Mock;

const wrapper: React.FC = ({ children }) => <BusinessProvider>{children}</BusinessProvider>;

describe('BusinessContext', () => {
    beforeEach(() => {
        // Reset mocks antes de cada test
        jest.clearAllMocks();
        // Simular una carga inicial exitosa por defecto
    mockGetBusinessData.mockResolvedValue({ ...INITIAL_BUSINESS_DATA, id: '00000000-0000-4000-8000-000000000000' });
        // Mock para updateBusinessData que devuelve lo que se le pasa
        mockUpdateBusinessData.mockImplementation(data => Promise.resolve(data));
    });

    it('should load initial state from the backend', async () => {
        const { result } = renderHook(() => useBusinessState(), { wrapper });

        // Esperar a que la carga inicial se complete
        await act(async () => {});
        
    expect(supabaseBackend.getBusinessData).toHaveBeenCalledTimes(1);
        expect(result.current.name).toBe(INITIAL_BUSINESS_DATA.name);
    });

    it('should handle a synchronous action like SET_PHONE', async () => {
        const { result } = renderHook(() => ({
            state: useBusinessState(),
            dispatch: useBusinessDispatch(),
        }), { wrapper });

        await act(async () => {}); // Esperar a la carga inicial

        const newPhone = '111-222-3333';
        
        await act(async () => {
            await result.current.dispatch({ type: 'SET_PHONE', payload: newPhone });
        });

        expect(result.current.state.phone).toBe(newPhone);
        expect(mockUpdateBusinessData).toHaveBeenCalledWith(expect.objectContaining({ phone: newPhone }));
    });

    it('should handle an asynchronous action like ADD_EMPLOYEE', async () => {
        const { result } = renderHook(() => ({
            state: useBusinessState(),
            dispatch: useBusinessDispatch(),
        }), { wrapper }); 

        await act(async () => {}); // Esperar a la carga inicial

        const newEmployee: Employee = { 
            id: 'e4', 
            businessId: INITIAL_BUSINESS_DATA.id,
            name: 'Nuevo Empleado', 
            avatarUrl: '', 
            whatsapp: '',
            hours: INITIAL_BUSINESS_DATA.hours 
        };
        
        // El mock ahora debe devolver el estado completo del negocio
        mockAddEmployee.mockResolvedValue({
            ...INITIAL_BUSINESS_DATA,
            employees: [...INITIAL_BUSINESS_DATA.employees, newEmployee],
        });

        await act(async () => {
            await result.current.dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });
        });

        expect(result.current.state.employees.length).toBe(INITIAL_BUSINESS_DATA.employees.length + 1);
        expect(result.current.state.employees.find(e => e.id === 'e4')).toBeDefined();
        expect(mockAddEmployee).toHaveBeenCalledWith(newEmployee);
    });

    it('should propagate errors from the backend', async () => {
        const { result } = renderHook(() => useBusinessDispatch(), { wrapper });

        await act(async () => {}); // Esperar a la carga inicial

        const newEmployee: Employee = { 
            id: 'e4', 
            businessId: INITIAL_BUSINESS_DATA.id,
            name: 'Test', 
            avatarUrl: '', 
            whatsapp: '',
            hours: INITIAL_BUSINESS_DATA.hours 
        };
        const errorMessage = 'Error de red simulado';
        mockAddEmployee.mockRejectedValue(new Error(errorMessage));

        let error: Error | null = null;
        try {
            await act(async () => {
                await result.current({ type: 'ADD_EMPLOYEE', payload: newEmployee });
            });
        } catch (e) {
            error = e as Error;
        }

        expect(error).not.toBeNull();
        expect(error?.message).toBe(errorMessage);
    });
});
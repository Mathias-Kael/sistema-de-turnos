import '@testing-library/jest-dom';

// Configuración global para tests
beforeAll(() => {
    // Silenciar warnings de consola esperados
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    jest.clearAllMocks();
});
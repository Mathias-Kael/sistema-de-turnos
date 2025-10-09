import '@testing-library/jest-dom';

// Configuración global para tests
beforeAll(() => {
    // Silenciar warnings de consola esperados
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Polyfill TextEncoder/Decoder para libs que lo requieren (react-router, whatwg-url)
    // @ts-ignore
    if (!(global as any).TextEncoder) {
        const { TextEncoder, TextDecoder } = require('util');
        // @ts-ignore
        (global as any).TextEncoder = TextEncoder;
        // @ts-ignore
        (global as any).TextDecoder = TextDecoder as any;
    }
});

afterEach(() => {
    jest.clearAllMocks();
});
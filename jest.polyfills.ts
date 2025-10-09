// Polyfills globales necesarios para ciertas librerías en entorno de test (jsdom)
import { TextEncoder, TextDecoder } from 'util';

// @ts-ignore
if (!(global as any).TextEncoder) {
  // @ts-ignore
  (global as any).TextEncoder = TextEncoder;
}
// @ts-ignore
if (!(global as any).TextDecoder) {
  // @ts-ignore
  (global as any).TextDecoder = TextDecoder as any;
}

// Web Crypto (getRandomValues) usado por varias dependencias
// jsdom ya define window.crypto, pero aseguramos una implementación mínima en global
// @ts-ignore
if (!(global as any).crypto) {
  // @ts-ignore
  (global as any).crypto = require('crypto').webcrypto;
}

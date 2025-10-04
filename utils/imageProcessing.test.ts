import { ImageProcessor } from './imageProcessing';
import { IMAGE_ERROR_MESSAGES, SUPPORTED_IMAGE_FORMATS, IMAGE_CONSTRAINTS } from '../constants';

describe('ImageProcessor (subset sin canvas)', () => {
  describe('validateFile', () => {
    it('acepta formatos soportados', () => {
      SUPPORTED_IMAGE_FORMATS.forEach(type => {
        const file = new File(['abc'], `test.${type.split('/')[1]}`, { type });
        const result = ImageProcessor.validateFile(file);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.file).toBe(file);
      });
    });

    it('rechaza formato inválido', () => {
      const file = new File(['abc'], 'test.gif', { type: 'image/gif' });
      const result = ImageProcessor.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(IMAGE_ERROR_MESSAGES.INVALID_FORMAT);
      expect(result.file).toBeUndefined();
    });

    it('rechaza archivo grande >10MB', () => {
      // Crear un blob grande simulando >10MB
      const bigSize = 10 * 1024 * 1024 + 1; // 10MB + 1 byte
      const bigContent = new Array(bigSize).fill('a').join('');
      const file = new File([bigContent], 'big.jpg', { type: 'image/jpeg' });
      const result = ImageProcessor.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => /demasiado grande/i.test(e))).toBe(true);
    });
  });

  describe('getOptimizedDimensions', () => {
    it('no altera dimensiones si ya están dentro de límites', () => {
      const dims = ImageProcessor.getOptimizedDimensions(800, 300, 1200, 400);
      expect(dims).toEqual({ width: 800, height: 300 });
    });

    it('escala usando ratio más restrictivo (ancho excede)', () => {
      // original 4000x500 -> max 1200x400 -> ratio width = 1200/4000 = 0.3, height ratio = 400/500 = 0.8 => usa 0.3
      const dims = ImageProcessor.getOptimizedDimensions(4000, 500, 1200, 400);
      expect(dims.width).toBe(1200);
      expect(dims.height).toBe(Math.round(500 * (1200 / 4000))); // 500 * 0.3 = 150
      expect(dims.height).toBe(150);
    });

    it('escala usando ratio más restrictivo (alto excede)', () => {
      // original 300x1200 -> max 1200x400 -> width ratio = 1200/300 = 4, height ratio = 400/1200 = 0.333..
      const dims = ImageProcessor.getOptimizedDimensions(300, 1200, 1200, 400);
      expect(dims.height).toBe(400);
      expect(dims.width).toBe(Math.round(300 * (400 / 1200))); // 300 * 0.333... = 100
      expect(dims.width).toBe(100);
    });

    it('escala ambos cuando ambos exceden', () => {
      const dims = ImageProcessor.getOptimizedDimensions(5000, 3000, 1200, 400);
      // width ratio = 1200/5000 = 0.24; height ratio = 400/3000 = 0.1333 -> usa 0.1333
      expect(dims.height).toBe(400);
      expect(dims.width).toBe(Math.round(5000 * (400 / 3000))); // 5000 * 0.1333 = 666.6 ~ 667
      expect(dims.width).toBe(667);
    });
  });
});

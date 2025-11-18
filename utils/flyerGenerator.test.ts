// utils/flyerGenerator.test.ts

import { FlyerGenerator } from './flyerGenerator';
import { FlyerData } from './flyerTypes';

// Mock QRCode library
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mocked-qr-code')
}));

describe('FlyerGenerator', () => {
  
  describe('generateQRCode', () => {
    it('should generate QR code data URL', async () => {
      const url = 'https://example.com/?token=test123';
      const result = await FlyerGenerator.generateQRCode(url);
      
      expect(result).toBe('data:image/png;base64,mocked-qr-code');
    });
  });

  describe('createFileName', () => {
    it('should create valid filename with business name', () => {
      const fileName = FlyerGenerator.createFileName('Mi Negocio & Co.');
      
      expect(fileName).toMatch(/^flyer-mi-negocio-co-\d+\.png$/);
    });

    it('should handle long business names', () => {
      const longName = 'Este es un nombre de negocio muy muy largo que debería ser truncado';
      const fileName = FlyerGenerator.createFileName(longName);
      
      expect(fileName.length).toBeLessThan(50); // Verificar truncamiento
      expect(fileName).toMatch(/^flyer-.*\.png$/);
    });

    it('should handle special characters', () => {
      const fileName = FlyerGenerator.createFileName('Café & Té @ 2024!');
      
      expect(fileName).toMatch(/^flyer-cafe-te-2024-\d+\.png$/);
    });
  });

  describe('generateFlyer', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;

    beforeEach(() => {
      // Mock Canvas API
      mockContext = {
        fillStyle: '',
        textAlign: 'left',
        font: '',
        fillRect: jest.fn(),
        fillText: jest.fn(),
        drawImage: jest.fn(),
        strokeRect: jest.fn(),
        measureText: jest.fn().mockReturnValue({ width: 100 }),
      } as any;

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue(mockContext),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mocked-flyer')
      } as any;

      // Mock document.createElement
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate flyer successfully with valid data', async () => {
      const flyerData: FlyerData = {
        businessName: 'Test Business',
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        qrCodeDataURL: 'data:image/png;base64,qr-test',
        linkPlaceholder: '________________'
      };

      const result = await FlyerGenerator.generateFlyer(flyerData, 'modern');

      expect(result.success).toBe(true);
      expect(result.dataURL).toBe('data:image/png;base64,mocked-flyer');
      expect(result.metadata).toMatchObject({
        width: 1080,
        height: 1080,
        template: 'modern'
      });
    });

    it('should fail with empty business name', async () => {
      const flyerData: FlyerData = {
        businessName: '   ', // Empty/whitespace
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        qrCodeDataURL: 'data:image/png;base64,qr-test',
        linkPlaceholder: '________________'
      };

      const result = await FlyerGenerator.generateFlyer(flyerData, 'modern');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Nombre del negocio es requerido');
    });

    it('should fail without QR code', async () => {
      const flyerData: FlyerData = {
        businessName: 'Test Business',
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        qrCodeDataURL: '', // Empty QR
        linkPlaceholder: '________________'
      };

      const result = await FlyerGenerator.generateFlyer(flyerData, 'modern');

      expect(result.success).toBe(false);
      expect(result.error).toContain('QR Code es requerido');
    });

    it('should set canvas dimensions correctly', async () => {
      const flyerData: FlyerData = {
        businessName: 'Test Business',
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        qrCodeDataURL: 'data:image/png;base64,qr-test',
        linkPlaceholder: '________________'
      };

      await FlyerGenerator.generateFlyer(flyerData, 'modern');

      expect(mockCanvas.width).toBe(1080);
      expect(mockCanvas.height).toBe(1080);
    });
  });

  describe('loadImage', () => {
    it('should load image successfully', async () => {
      // Mock Image constructor
      const mockImage = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        src: '',
        crossOrigin: '',
        onload: null as any,
        onerror: null as any
      };

      global.Image = jest.fn(() => mockImage) as any;

      const loadPromise = FlyerGenerator.loadImage('test.jpg');
      
      // Simulate successful load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as any);
      }, 0);

      const result = await loadPromise;
      expect(result).toBe(mockImage);
      expect(mockImage.crossOrigin).toBe('anonymous');
      expect(mockImage.src).toBe('test.jpg');
    });

    it('should reject on image load error', async () => {
      const mockImage = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        src: '',
        crossOrigin: '',
        onload: null as any,
        onerror: null as any
      };

      global.Image = jest.fn(() => mockImage) as any;

      const loadPromise = FlyerGenerator.loadImage('invalid.jpg');
      
      // Simulate error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror({} as any);
      }, 0);

      await expect(loadPromise).rejects.toThrow('Failed to load image: invalid.jpg');
    });
  });

  describe('downloadFlyer', () => {
    it('should trigger download with correct filename', () => {
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };

      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();

      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      const dataURL = 'data:image/png;base64,test';
      const filename = 'test-flyer.png';

      FlyerGenerator.downloadFlyer(dataURL, filename);

      expect(mockLink.href).toBe(dataURL);
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
    });
  });

});
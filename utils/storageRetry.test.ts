import { withStorageRetry, uploadWithRetry } from './storageRetry';

describe('storageRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withStorageRetry', () => {
    it('debería ejecutar la operación una vez si tiene éxito', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withStorageRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('debería reintentar errores de red con backoff exponencial', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ERR_CONNECTION_CLOSED'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();
      const result = await withStorageRetry(operation, { 
        baseDelay: 10,
        onRetry 
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 3, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 3, expect.any(Error));
    });

    it('debería lanzar error inmediatamente si no es retriable', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Permission denied'));
      
      await expect(withStorageRetry(operation)).rejects.toThrow('Permission denied');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('debería agotar intentos y lanzar último error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fetch failed'));
      
      await expect(
        withStorageRetry(operation, { maxAttempts: 2, baseDelay: 10 })
      ).rejects.toThrow('fetch failed');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('debería respetar maxDelay en backoff exponencial', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockRejectedValueOnce(new Error('network'))
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValue('success');

      const start = Date.now();
      await withStorageRetry(operation, { 
        baseDelay: 50,
        maxDelay: 100,
        maxAttempts: 4
      });
      const elapsed = Date.now() - start;

      // Delays: 50ms, 100ms (capped), 100ms (capped) = ~250ms total
      expect(elapsed).toBeGreaterThanOrEqual(200);
      expect(elapsed).toBeLessThan(400);
    });
  });

  describe('uploadWithRetry', () => {
    it('debería envolver upload con retry automático', async () => {
      const mockStorage = {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn()
          .mockResolvedValueOnce({ data: null, error: new Error('ERR_CONNECTION_CLOSED') })
          .mockResolvedValue({ data: { path: 'test.jpg' }, error: null })
      };

      const result = await uploadWithRetry(mockStorage, {
        bucket: 'test-bucket',
        path: 'test.jpg',
        file: new Blob(['test']),
        options: { contentType: 'image/jpeg' }
      });

      expect(result.data).toEqual({ path: 'test.jpg' });
      expect(result.error).toBeNull();
      expect(mockStorage.upload).toHaveBeenCalledTimes(2);
    });

    it('debería retornar error si upload falla después de retries', async () => {
      const mockStorage = {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ data: null, error: new Error('timeout') })
      };

      const result = await uploadWithRetry(mockStorage, {
        bucket: 'test-bucket',
        path: 'test.jpg',
        file: new Blob(['test'])
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(mockStorage.upload).toHaveBeenCalledTimes(3);
    });
  });
});

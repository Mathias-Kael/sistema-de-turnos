import { imageStorage } from './imageStorage';
import { ImageProcessor } from '../utils/imageProcessing';
import { IMAGE_CONSTRAINTS } from '../constants';

describe('imageStorage (LocalStorageImageService)', () => {
  const ORIGINAL_PROCESS_IMAGE = ImageProcessor.processImage;

  beforeEach(() => {
    // Limpiar localStorage y mocks antes de cada test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restaurar implementación real por seguridad
    ImageProcessor.processImage = ORIGINAL_PROCESS_IMAGE;
  });

  function mockProcessImage(options?: { finalSize?: number; width?: number; height?: number; wasCompressed?: boolean }) {
    const { finalSize = 50 * 1024, width = 300, height = 300, wasCompressed = true } = options || {};
    ImageProcessor.processImage = jest.fn().mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,FAKE_BASE64_DATA',
      originalSize: finalSize * 2,
      finalSize,
      width,
      height,
      wasCompressed,
    } as any);
  }

  it('sube imagen, genera imageId y guarda base64 en localStorage', async () => {
    mockProcessImage();

    const dummyFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    const result = await imageStorage.uploadImage(dummyFile, 'avatar');

    expect(result.success).toBe(true);
    expect(result.imageId).toMatch(/^img_avatar_/);
    expect(result.imageUrl).toContain('data:image/jpeg;base64');
    // Verifica que realmente se guardó
    const stored = localStorage.getItem(result.imageId);
    expect(stored).toBe(result.imageUrl);
  });

  it('elimina oldImageId antes de guardar la nueva', async () => {
    mockProcessImage();

    // Subir primera imagen
    const file1 = new File(['one'], 'one.jpg', { type: 'image/jpeg' });
    const first = await imageStorage.uploadImage(file1, 'profile');
    expect(first.success).toBe(true);
    expect(localStorage.getItem(first.imageId)).toBeTruthy();

    // Subir segunda imagen pasando oldImageId
    const file2 = new File(['two'], 'two.jpg', { type: 'image/jpeg' });
    const second = await imageStorage.uploadImage(file2, 'profile', first.imageId);

    expect(second.success).toBe(true);
    expect(localStorage.getItem(first.imageId)).toBeNull(); // Debió eliminarse
    expect(localStorage.getItem(second.imageId)).toBe(second.imageUrl);
  });

  it('retorna error si ImageProcessor lanza excepción', async () => {
    ImageProcessor.processImage = jest.fn().mockRejectedValue(new Error('Fallo proceso'));

    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    const result = await imageStorage.uploadImage(file, 'avatar');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Fallo proceso/);
    expect(result.imageId).toBe('');
  });

  it('valida tamaño final contra constraints y retorna error si excede', async () => {
    // Para forzar error, mockeamos processImage para devolver finalSize mayor que constraint
    const constraint = IMAGE_CONSTRAINTS.avatar;
    ImageProcessor.processImage = jest.fn().mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,TOO_BIG',
      originalSize: constraint.maxSizeBytes * 2,
      finalSize: constraint.maxSizeBytes + 10_000,
      width: 500,
      height: 500,
      wasCompressed: false,
    });

    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    const result = await imageStorage.uploadImage(file, 'avatar');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/excede el límite/);
  });

  it('getImageUrl retorna base64 para IDs locales', async () => {
    mockProcessImage();
    const file = new File(['data'], 'a.jpg', { type: 'image/jpeg' });
    const upload = await imageStorage.uploadImage(file, 'cover');

    const resolved = imageStorage.getImageUrl(upload.imageId);
    expect(resolved).toBe(upload.imageUrl);
  });

  it('getImageUrl retorna la misma cadena si no es ID local', () => {
    const external = 'https://example.com/imagen.jpg';
    expect(imageStorage.getImageUrl(external)).toBe(external);
  });

  it('deleteImage elimina solo IDs locales', async () => {
    mockProcessImage();
    const file = new File(['data'], 'b.jpg', { type: 'image/jpeg' });
    const upload = await imageStorage.uploadImage(file, 'profile');
    expect(localStorage.getItem(upload.imageId)).toBeTruthy();

    await imageStorage.deleteImage(upload.imageId);
    expect(localStorage.getItem(upload.imageId)).toBeNull();

    // No debería fallar con URL externa
    await expect(imageStorage.deleteImage('https://externa.com/img.jpg')).resolves.toBeUndefined();
  });
});

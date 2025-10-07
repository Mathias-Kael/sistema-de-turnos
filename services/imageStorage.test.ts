import { imageStorage } from './imageStorage';
import { ImageProcessor } from '../utils/imageProcessing';
import { supabase } from '../lib/supabase';

// Crear un único objeto mock para poder inspeccionar llamadas entre invocaciones
const storageApi = {
  upload: jest.fn().mockResolvedValue({ data: { path: 'avatar_123' }, error: null }),
  getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/public/avatar_123' } }),
  remove: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock('../lib/supabase', () => {
  const fromFn = jest.fn().mockImplementation((_bucket: string) => storageApi);
  return {
    supabase: {
      storage: { from: fromFn },
    },
  };
});

describe('imageStorage (SupabaseImageStorage)', () => {
  const ORIGINAL_PROCESS = ImageProcessor.processImage;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (storageApi.upload as jest.Mock).mockResolvedValue({ data: { path: 'avatar_123' }, error: null });
    (storageApi.getPublicUrl as jest.Mock).mockReturnValue({ data: { publicUrl: 'https://example.com/public/avatar_123' } });
    (storageApi.remove as jest.Mock).mockResolvedValue({ data: null, error: null });

    ImageProcessor.processImage = jest.fn().mockResolvedValue({
      dataUrl: 'data:image/png;base64,AAA',
      originalSize: 1000,
      finalSize: 800,
      width: 200,
      height: 200,
      wasCompressed: true,
    });

    // Mock de dataURL -> Blob evitando fetch real
    (imageStorage as any).dataURLToBlob = jest.fn().mockResolvedValue(new Blob(['abc'], { type: 'image/png' }));
  });

  afterEach(() => {
    ImageProcessor.processImage = ORIGINAL_PROCESS;
    global.fetch = originalFetch;
  });

  it('sube imagen y retorna url pública', async () => {
    const file = new File(['data'], 'a.png', { type: 'image/png' });
    const res = await imageStorage.uploadImage(file, 'avatar');
    expect(res.success).toBe(true);
    expect(storageApi.upload).toHaveBeenCalled();
    expect(res.imageUrl).toContain('https://example.com/public');
  });

  it('elimina imagen previa cuando oldImageId está presente', async () => {
    const file = new File(['data'], 'a.png', { type: 'image/png' });
    await imageStorage.uploadImage(file, 'profile', 'profile_old_123');
    expect(storageApi.remove).toHaveBeenCalledWith(['profile_old_123']);
  });

  it('propaga error de procesamiento', async () => {
    ImageProcessor.processImage = jest.fn().mockRejectedValue(new Error('fail'));
    const file = new File(['x'], 'x.png', { type: 'image/png' });
    const res = await imageStorage.uploadImage(file, 'avatar');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});

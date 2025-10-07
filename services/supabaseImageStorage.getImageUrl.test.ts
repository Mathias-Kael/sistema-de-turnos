import { imageStorage } from './imageStorage';
import { supabase } from '../lib/supabase';

const getPublicUrlMock = jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/public/bucket/file_123' } });
jest.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        getPublicUrl: (...args: any[]) => getPublicUrlMock(...args)
      })
    }
  }
}));

describe('supabaseImageStorage.getImageUrl', () => {
  it('devuelve la misma URL si ya es absoluta', () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/business-images/cover_abc';
    expect(imageStorage.getImageUrl(url)).toBe(url);
  });

  it('construye URL pública cuando se pasa un fileName avatar_', () => {
    const result = imageStorage.getImageUrl('avatar_999');
    expect(result).toContain('https://example.com/public');
  });

  it('usa bucket business-images para fileName genérico', () => {
    const result = imageStorage.getImageUrl('profile_123');
    expect(result).toContain('https://example.com/public');
  });

  it('fallback al identifier si no hay publicUrl', () => {
    getPublicUrlMock.mockReturnValueOnce({ data: { publicUrl: '' } });
    const result = imageStorage.getImageUrl('avatar_zzz');
    expect(result).toBe('avatar_zzz');
  });
});

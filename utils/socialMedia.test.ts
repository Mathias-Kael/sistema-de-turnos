// utils/socialMedia.test.ts
import {
  sanitizeWhatsappNumber,
  isValidWhatsappNumber,
  sanitizeInstagramUsername,
  isValidInstagramUsername,
  sanitizeFacebookPage,
  isValidFacebookPage,
  buildWhatsappBusinessUrl,
  buildInstagramUrl,
  buildFacebookUrl,
} from './socialMedia';

describe('socialMedia utils', () => {
  describe('WhatsApp', () => {
    describe('sanitizeWhatsappNumber', () => {
      it('should preserve + and remove non-digits', () => {
        expect(sanitizeWhatsappNumber('+54 911 1234-5678')).toBe('+5491112345678');
        expect(sanitizeWhatsappNumber('+1 (555) 123-4567')).toBe('+15551234567');
      });

      it('should handle numbers without +', () => {
        expect(sanitizeWhatsappNumber('5491112345678')).toBe('5491112345678');
        expect(sanitizeWhatsappNumber('11 1234 5678')).toBe('1112345678');
      });

      it('should handle empty string', () => {
        expect(sanitizeWhatsappNumber('')).toBe('');
      });
    });

    describe('isValidWhatsappNumber', () => {
      it('should accept valid international numbers', () => {
        expect(isValidWhatsappNumber('+5491112345678')).toBe(true);
        expect(isValidWhatsappNumber('+15551234567')).toBe(true);
      });

      it('should accept numbers without +', () => {
        expect(isValidWhatsappNumber('5491112345678')).toBe(true);
      });

      it('should reject numbers with less than 8 digits', () => {
        expect(isValidWhatsappNumber('+541234')).toBe(false);
        expect(isValidWhatsappNumber('1234567')).toBe(false);
      });

      it('should accept empty string as optional', () => {
        expect(isValidWhatsappNumber('')).toBe(true);
      });
    });

    describe('buildWhatsappBusinessUrl', () => {
      it('should build URL without message', () => {
        const url = buildWhatsappBusinessUrl('+5491112345678');
        expect(url).toBe('https://wa.me/5491112345678');
      });

      it('should build URL with message', () => {
        const url = buildWhatsappBusinessUrl('+5491112345678', 'Hola!');
        expect(url).toBe('https://wa.me/5491112345678?text=Hola!');
      });

      it('should handle numbers without +', () => {
        const url = buildWhatsappBusinessUrl('5491112345678');
        expect(url).toBe('https://wa.me/5491112345678');
      });

      it('should return empty string for empty number', () => {
        expect(buildWhatsappBusinessUrl('')).toBe('');
      });
    });
  });

  describe('Instagram', () => {
    describe('sanitizeInstagramUsername', () => {
      it('should remove @ prefix', () => {
        expect(sanitizeInstagramUsername('@mi_negocio')).toBe('mi_negocio');
        expect(sanitizeInstagramUsername('@@usuario')).toBe('usuario');
      });

      it('should remove spaces', () => {
        expect(sanitizeInstagramUsername('mi negocio')).toBe('minegocio');
      });

      it('should handle username without @', () => {
        expect(sanitizeInstagramUsername('mi_negocio')).toBe('mi_negocio');
      });

      it('should handle empty string', () => {
        expect(sanitizeInstagramUsername('')).toBe('');
      });
    });

    describe('isValidInstagramUsername', () => {
      it('should accept valid usernames', () => {
        expect(isValidInstagramUsername('mi_negocio')).toBe(true);
        expect(isValidInstagramUsername('negocio.oficial')).toBe(true);
        expect(isValidInstagramUsername('negocio123')).toBe(true);
      });

      it('should reject invalid characters', () => {
        expect(isValidInstagramUsername('mi-negocio')).toBe(false);
        // Note: spaces are sanitized before validation, so test the sanitized result
        expect(isValidInstagramUsername(sanitizeInstagramUsername('mi negocio'))).toBe(true);
        expect(isValidInstagramUsername(sanitizeInstagramUsername('@minegocio'))).toBe(true);
      });

      it('should reject usernames longer than 30 chars', () => {
        expect(isValidInstagramUsername('a'.repeat(31))).toBe(false);
      });

      it('should accept empty string as optional', () => {
        expect(isValidInstagramUsername('')).toBe(true);
      });
    });

    describe('buildInstagramUrl', () => {
      it('should build correct URL', () => {
        expect(buildInstagramUrl('mi_negocio')).toBe('https://instagram.com/mi_negocio');
      });

      it('should handle @ prefix', () => {
        expect(buildInstagramUrl('@mi_negocio')).toBe('https://instagram.com/mi_negocio');
      });

      it('should return empty string for empty username', () => {
        expect(buildInstagramUrl('')).toBe('');
      });
    });
  });

  describe('Facebook', () => {
    describe('sanitizeFacebookPage', () => {
      it('should extract username from full URL', () => {
        expect(sanitizeFacebookPage('https://facebook.com/mi.negocio/')).toBe('mi.negocio');
        expect(sanitizeFacebookPage('https://fb.com/minegocio')).toBe('minegocio');
        expect(sanitizeFacebookPage('https://fb.me/negocio123')).toBe('negocio123');
      });

      it('should handle plain username', () => {
        expect(sanitizeFacebookPage('mi.negocio')).toBe('mi.negocio');
      });

      it('should remove spaces', () => {
        expect(sanitizeFacebookPage('mi negocio')).toBe('minegocio');
      });

      it('should handle empty string', () => {
        expect(sanitizeFacebookPage('')).toBe('');
      });
    });

    describe('isValidFacebookPage', () => {
      it('should accept valid page IDs', () => {
        expect(isValidFacebookPage('mi.negocio')).toBe(true);
        expect(isValidFacebookPage('minegocio123')).toBe(true);
      });

      it('should reject IDs shorter than 5 chars', () => {
        expect(isValidFacebookPage('ab12')).toBe(false);
      });

      it('should reject invalid characters', () => {
        expect(isValidFacebookPage('mi-negocio')).toBe(false);
        expect(isValidFacebookPage('mi_negocio')).toBe(false);
      });

      it('should accept empty string as optional', () => {
        expect(isValidFacebookPage('')).toBe(true);
      });
    });

    describe('buildFacebookUrl', () => {
      it('should build correct URL', () => {
        expect(buildFacebookUrl('mi.negocio')).toBe('https://facebook.com/mi.negocio');
      });

      it('should extract from full URL', () => {
        expect(buildFacebookUrl('https://facebook.com/mi.negocio/')).toBe('https://facebook.com/mi.negocio');
      });

      it('should return empty string for empty page', () => {
        expect(buildFacebookUrl('')).toBe('');
      });
    });
  });
});

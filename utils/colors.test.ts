import { adjustColorForDarkMode } from './colors';

describe('adjustColorForDarkMode', () => {
  it('should handle valid hex colors', () => {
    const result = adjustColorForDarkMode('#3b82f6');
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should handle undefined input gracefully', () => {
    const result = adjustColorForDarkMode(undefined);
    expect(result).toBe('#3b82f6'); // Default blue
  });

  it('should handle null input gracefully', () => {
    const result = adjustColorForDarkMode(null as any);
    expect(result).toBe('#3b82f6'); // Default blue
  });

  it('should handle empty string gracefully', () => {
    const result = adjustColorForDarkMode('');
    expect(result).toBe('#3b82f6'); // Default blue
  });

  it('should handle non-hex colors by returning them unchanged', () => {
    const result = adjustColorForDarkMode('rgb(255, 0, 0)');
    expect(result).toBe('rgb(255, 0, 0)');
  });

  it('should increase luminosity for dark colors', () => {
    const darkColor = '#1a1a1a'; // Very dark gray
    const result = adjustColorForDarkMode(darkColor);
    
    // Result should be lighter (higher luminosity)
    // Extract hex values and compare brightness
    const originalBrightness = parseInt(darkColor.substring(1, 3), 16);
    const resultBrightness = parseInt(result.substring(1, 3), 16);
    
    expect(resultBrightness).toBeGreaterThan(originalBrightness);
  });

  it('should maintain hex format', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#123456'];
    
    colors.forEach(color => {
      const result = adjustColorForDarkMode(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

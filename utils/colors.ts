/**
 * Convierte un color hexadecimal a un objeto HSL.
 * @param hex - El color en formato #RRGGBB.
 * @returns Un objeto { h, s, l }.
 */
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    let r = parseInt(hex.substring(1, 3), 16) / 255;
    let g = parseInt(hex.substring(3, 5), 16) / 255;
    let b = parseInt(hex.substring(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
};

/**
 * Convierte un color HSL a un objeto RGB.
 */
const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: 255 * f(0), g: 255 * f(8), b: 255 * f(4) };
};

/**
 * Convierte un valor de color RGB a un string hexadecimal.
 */
const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (c: number) => ('0' + Math.round(c).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};


/**
 * Aclara un color para su uso en modo oscuro, asegurando que mantenga
 * suficiente saturación para no parecer gris.
 * @param hexColor - El color original en formato hexadecimal.
 * @returns El nuevo color aclarado en formato hexadecimal.
 */
export const adjustColorForDarkMode = (hexColor: string | undefined): string => {
    // Defensive check: return default if undefined or invalid
    if (!hexColor || typeof hexColor !== 'string') {
        console.warn('[adjustColorForDarkMode] Invalid color received:', hexColor);
        return '#3b82f6'; // Default blue
    }
    
    if (!hexColor.startsWith('#')) return hexColor;

    const hsl = hexToHsl(hexColor);

    // Aumentar la luminosidad. El objetivo es que sea claramente visible sobre #121212.
    // Un valor de 60-75% suele funcionar bien.
    hsl.l = Math.max(hsl.l, 65);
    hsl.l = Math.min(hsl.l, 80);


    // Asegurar una saturación mínima para que el color no se vea desvaído.
    hsl.s = Math.max(hsl.s, 40);

    const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l);
    
    return rgbToHex(r, g, b);
};
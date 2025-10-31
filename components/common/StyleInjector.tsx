import React, { useEffect } from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { Branding } from '../../types';
import { adjustColorForDarkMode } from '../../utils/colors';
import { logger } from '../../utils/logger';

/**
 * A component that injects dynamic branding styles into the document head.
 * It uses CSS custom properties (variables) to allow for live theme updates
 * based on the business branding configuration from the context.
 * It does not render any visible elements.
 */
interface StyleInjectorProps { brandingOverride?: Branding }

export const StyleInjector: React.FC<StyleInjectorProps> = ({ brandingOverride }) => {
    let branding;
    if (brandingOverride) {
        branding = brandingOverride;
    } else {
        branding = useBusinessState().branding;
    }

    // Defensive programming: validate branding structure
    useEffect(() => {
        logger.debug('[StyleInjector] Branding received:', branding);
        
        if (!branding) {
            logger.error('[StyleInjector] Branding is undefined!');
        } else {
            if (!branding.primaryColor) logger.warn('[StyleInjector] Missing primaryColor');
            if (!branding.secondaryColor) logger.warn('[StyleInjector] Missing secondaryColor');
            if (!branding.textColor) logger.warn('[StyleInjector] Missing textColor');
            if (!branding.font) logger.warn('[StyleInjector] Missing font');
        }
    }, [branding]);

    // Fallbacks for missing branding values
    const safeBranding = {
        primaryColor: branding?.primaryColor || '#3b82f6',
        secondaryColor: branding?.secondaryColor || '#10b981',
        textColor: branding?.textColor || '#ffffff',
        font: branding?.font || 'Poppins, sans-serif'
    };

    // Import all fonts used in presets to ensure they are available.
    const googleFontsUrl = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap";

    // Utilidad local para mezclar colores hex simple (srgb) sin dependencias
    const blend = (hexA: string, hexB: string, percentA: number): string => {
        const norm = (h: string) => {
            let x = h.replace('#','').trim();
            if (x.length === 3) x = x.split('').map(c => c + c).join('');
            return x;
        };
        const a = norm(hexA);
        const b = norm(hexB);
        const pa = Math.min(100, Math.max(0, percentA)) / 100;
        const pb = 1 - pa;
        const ch = (i: number) => Math.round(parseInt(a.substr(i,2),16)*pa + parseInt(b.substr(i,2),16)*pb);
        const toHex = (n: number) => n.toString(16).padStart(2,'0');
        return `#${toHex(ch(0))}${toHex(ch(2))}${toHex(ch(4))}`;
    };

    // Fallbacks equivalentes a las expresiones color-mix utilizadas abajo
    // blend ahora recibe porcentaje entero (0-100) para la proporción del primer color
    const primaryDarkFallback = blend(safeBranding.primaryColor, '#000000', 80); // 80% brand + 20% black
    const primaryLightFallback = blend(safeBranding.primaryColor, '#ffffff', 15); // 15% brand + 85% white

    const dynamicStyles = `
        :root {
            /* Light Mode Semantic Colors */
            --color-background: #ffffff;
            --color-surface: #f7fafc;
            --color-surface-hover: #edf2f7; /* Added for light mode */
            --color-text-primary: #2d3748;
            --color-text-secondary: #718096;
            --color-border: #e2e8f0;

            /* State Colors - Light Mode */
            --color-state-success-bg: #d4edda;
            --color-state-success-text: #155724;
            --color-state-warning-bg: #fff3cd;
            --color-state-warning-text: #856404;
            --color-state-danger-bg: #f8d7da;
            --color-state-danger-text: #721c24;
            --color-state-neutral-bg: #e2e8f0;
            --color-state-neutral-text: #2d3748;
            --color-state-danger-strong: #b91c1c; /* Added for light mode */

            /* Branding Colors */
            --color-brand-primary: ${safeBranding.primaryColor};
            --color-brand-secondary: ${safeBranding.secondaryColor};
            --color-brand-text: ${safeBranding.textColor};
            --font-family-brand: ${safeBranding.font};
            /* Modern variables usando color-mix */
            --color-brand-primary-dark: color-mix(in srgb, var(--color-brand-primary) 80%, black);
            --color-brand-primary-light: color-mix(in srgb, var(--color-brand-primary) 15%, white);
            /* Fallbacks precomputados (legacy) */
            --color-brand-primary-dark-legacy: ${primaryDarkFallback};
            --color-brand-primary-light-legacy: ${primaryLightFallback};
        }

        @media (prefers-color-scheme: dark) {
            :root {
                /* Dark Mode Professional Palette */
                --color-background: #121212;
                --color-surface: #1e1e1e;
                --color-text-primary: #E0E0E0;
                --color-text-secondary: #A0A0A0;
                --color-border: #2c2c2c;
                --color-surface-hover: #2a2a2a;

                /* State Colors - Dark Mode */
                --color-state-success-bg: #1f3d2e;
                --color-state-success-text: #a8e0b8;
                --color-state-warning-bg: #4d401a;
                --color-state-warning-text: #ffe082;
                --color-state-danger-bg: #4a2025;
                --color-state-danger-text: #ff8a80;
                --color-state-neutral-bg: #2c2c2c;
                --color-state-neutral-text: #E0E0E0;
                --color-state-danger-strong: #dc2626; /* Added for dark mode */

                /* Adapt branding colors for dark mode */
                --color-brand-primary: ${adjustColorForDarkMode(safeBranding.primaryColor)};
                --color-brand-secondary: ${adjustColorForDarkMode(safeBranding.secondaryColor)};
            }
        }
        
        /* Global styles */
        body {
            background-color: var(--color-background);
            color: var(--color-text-primary);
            font-family: var(--font-family-brand);
            transition: background-color 0.3s, color 0.3s;
        }

        /* Utility classes to apply branding colors */
        .bg-primary { background-color: var(--color-brand-primary); }
        .bg-secondary { background-color: var(--color-brand-secondary); }
        .text-brand-primary { color: var(--color-brand-primary); } /* Renamed from .text-primary */
        .text-brand { color: var(--color-brand-text); }
        .text-brand-text { color: var(--color-brand-text); } /* Added utility for text-brand-text */
        .border-primary { border-color: var(--color-brand-primary); }
        .accent-primary { accent-color: var(--color-brand-primary); }

        /* Estilos específicos para checkboxes y radio buttons */
        input[type="checkbox"],
        input[type="radio"] {
            /* Color del borde por defecto */
            border-color: var(--color-border);
            /* Fondo por defecto */
            background-color: var(--color-background);
        }

        input[type="checkbox"]:checked,
        input[type="radio"]:checked {
            /* Color de fondo cuando está marcado */
            background-color: var(--color-brand-primary);
            /* Color del borde cuando está marcado */
            border-color: var(--color-brand-primary);
        }

        /* Para asegurar que el icono de check sea visible en el color de marca */
        input[type="checkbox"]:checked {
            color: var(--color-brand-text); /* Color del "tick" */
        }

        /* Custom hover class for buttons */
        .hover-bg-primary:hover {
            background-color: var(--color-brand-primary);
            color: var(--color-brand-text); /* Adjusted text color for hover */
        }

        /* New Semantic Utility Classes */
        .bg-background { background-color: var(--color-background); }
        .bg-surface { background-color: var(--color-surface); }
        .text-primary { color: var(--color-text-primary); }
        .text-secondary { color: var(--color-text-secondary); }
        .border-default { border-color: var(--color-border); }
        .hover\\:bg-surface-hover:hover { background-color: var(--color-surface-hover); }
        /* Clases con fallback: si el navegador no soporta color-mix() sustituimos la variable moderna con la legacy vía script, pero aquí aseguramos fallback explícito */
        .bg-primary-dark { background-color: var(--color-brand-primary-dark, var(--color-brand-primary-dark-legacy)); }
        .hover\:bg-primary-dark:hover { background-color: var(--color-brand-primary-dark, var(--color-brand-primary-dark-legacy)); color: var(--color-brand-text); }
        .hover\:text-primary-dark:hover { color: var(--color-brand-primary-dark, var(--color-brand-primary-dark-legacy)); }
        .bg-primary-light { background-color: var(--color-brand-primary-light, var(--color-brand-primary-light-legacy)); }
    `;

    // En runtime detectamos soporte a color-mix; si no existe, aplicamos fallback directo a las variables modernas.
    useEffect(() => {
        try {
            const supports = (window as any).CSS && (window as any).CSS.supports && (CSS.supports('background', 'color-mix(in srgb, white 50%, black)'));
            if (!supports) {
                const root = document.documentElement.style;
                root.setProperty('--color-brand-primary-dark', primaryDarkFallback);
                root.setProperty('--color-brand-primary-light', primaryLightFallback);
            }
        } catch {
            const root = document.documentElement.style;
            root.setProperty('--color-brand-primary-dark', primaryDarkFallback);
            root.setProperty('--color-brand-primary-light', primaryLightFallback);
        }
    }, [primaryDarkFallback, primaryLightFallback]);

    return (
        <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href={googleFontsUrl} rel="stylesheet" />
            <style>{dynamicStyles}</style>
        </>
    );
};

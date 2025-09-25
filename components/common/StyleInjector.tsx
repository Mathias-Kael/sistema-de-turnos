import React from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { adjustColorForDarkMode } from '../../utils/colors';

/**
 * A component that injects dynamic branding styles into the document head.
 * It uses CSS custom properties (variables) to allow for live theme updates
 * based on the business branding configuration from the context.
 * It does not render any visible elements.
 */
export const StyleInjector: React.FC = () => {
    const { branding } = useBusinessState();

    // Import all fonts used in presets to ensure they are available.
    const googleFontsUrl = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap";

    const dynamicStyles = `
        :root {
            /* Light Mode Semantic Colors */
            --color-background: #ffffff;
            --color-surface: #f7fafc;
            --color-text-primary: #2d3748;
            --color-text-secondary: #718096;
            --color-border: #e2e8f0;

            /* Branding Colors */
            --color-brand-primary: ${branding.primaryColor};
            --color-brand-secondary: ${branding.secondaryColor};
            --color-brand-text: ${branding.textColor};
            --font-family-brand: ${branding.font};
            --color-brand-primary-dark: color-mix(in srgb, var(--color-brand-primary) 80%, black);
            --color-brand-primary-light: color-mix(in srgb, var(--color-brand-primary) 15%, white);
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

                /* Adapt branding colors for dark mode */
                --color-brand-primary: ${adjustColorForDarkMode(branding.primaryColor)};
                --color-brand-secondary: ${adjustColorForDarkMode(branding.secondaryColor)};
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
        .text-primary { color: var(--color-brand-primary); }
        .text-brand { color: var(--color-brand-text); }
        .border-primary { border-color: var(--color-brand-primary); }
        .accent-primary { accent-color: var(--color-brand-primary); }

        /* Custom hover class for buttons */
        .hover-bg-primary:hover {
            background-color: var(--color-brand-primary);
            /* TODO: Determine appropriate text color on hover */
            color: #ffffff;
        }

        /* New Semantic Utility Classes */
        .bg-background { background-color: var(--color-background); }
        .bg-surface { background-color: var(--color-surface); }
        .text-primary { color: var(--color-text-primary); }
        .text-secondary { color: var(--color-text-secondary); }
        .border-default { border-color: var(--color-border); }
        .hover\\:bg-surface-hover:hover { background-color: var(--color-surface-hover); }
        .bg-primary-dark { background-color: var(--color-brand-primary-dark); }
        .bg-primary-light { background-color: var(--color-brand-primary-light); }
    `;

    return (
        <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href={googleFontsUrl} rel="stylesheet" />
            <style>{dynamicStyles}</style>
        </>
    );
};

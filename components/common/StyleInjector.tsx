import React from 'react';
import { useBusinessState } from '../../context/BusinessContext';

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
            --color-primary: ${branding.primaryColor};
            --color-secondary: ${branding.secondaryColor};
            --color-text: ${branding.textColor};
            --font-family: ${branding.font};
        }
        
        /* Utility classes to apply branding colors */
        .bg-primary { background-color: var(--color-primary); }
        .bg-secondary { background-color: var(--color-secondary); }
        .text-primary { color: var(--color-primary); }
        .text-brand { color: var(--color-text); }
        .text-brand\\/90 { color: var(--color-text); opacity: 0.9; }
        .text-brand\\/80 { color: var(--color-text); opacity: 0.8; }
        .border-primary { border-color: var(--color-primary); }
        .accent-primary { accent-color: var(--color-primary); }

        /* Custom hover class for buttons */
        .hover-bg-primary:hover {
            background-color: var(--color-primary);
            color: #ffffff; /* Assuming white text on primary hover */
        }
        
        /* Global styles */
        body {
            font-family: var(--font-family);
            color: var(--color-text);
        }
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

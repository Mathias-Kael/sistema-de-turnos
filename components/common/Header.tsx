import React, { useState } from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { MobileMenu } from './MobileMenu';

export const Header: React.FC = () => {
    const { name, description, logoUrl } = useBusinessState();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <>
            <header className="flex items-center justify-between p-4 border-b border-default">
                <div className="flex items-center space-x-4">
                    {logoUrl && (
                        <img
                            src={logoUrl}
                            alt={`${name} logo`}
                            className="h-12 w-12 rounded-full object-cover shadow-md"
                        />
                    )}
                    <h1 className="text-2xl font-bold text-primary">{name}</h1>
                </div>

                <nav className="hidden md:flex space-x-6">
                    <a href="#" className="text-base text-primary hover:underline">Inicio</a>
                    <a href="#" className="text-base text-primary hover:underline">Servicios</a>
                    <a href="#" className="text-base text-primary hover:underline">Contacto</a>
                </nav>

                <div className="md:hidden">
                    <button onClick={toggleMenu} aria-label="Abrir menú">
                        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                </div>
            </header>
            <div className="text-center py-6">
                <p className="mt-2 text-lg text-secondary max-w-2xl mx-auto">{description}</p>
            </div>
            <MobileMenu isOpen={isMenuOpen} onClose={toggleMenu} />
        </>
    );
};

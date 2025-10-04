import React, { useState } from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { imageStorage } from '../../services/imageStorage';

export const Header: React.FC = () => {
    const { name, description, profileImageUrl } = useBusinessState();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const logoUrl = profileImageUrl ? imageStorage.getImageUrl(profileImageUrl) : undefined;
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
                    <button onClick={toggleMenu} className="p-2 rounded hover:bg-surface" aria-label="Toggle menu">☰</button>
                </div>
            </header>
            <div className="text-center py-6">
                <p className="mt-2 text-lg text-secondary max-w-2xl mx-auto">{description}</p>
            </div>
        </>
    );
};

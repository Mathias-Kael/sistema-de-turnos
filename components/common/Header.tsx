import React from 'react';
import { useBusinessState } from '../../context/BusinessContext';

export const Header: React.FC = () => {
    const { name, description, logoUrl } = useBusinessState();

    return (
        <header className="text-center py-6">
            {logoUrl && (
                <img
                    src={logoUrl}
                    alt={`${name} logo`}
                    className="h-24 w-24 mx-auto rounded-full object-cover mb-4 shadow-md"
                />
            )}
            <h1 className="text-4xl font-bold text-primary">{name}</h1>
            <p className="mt-2 text-lg text-brand/90 max-w-2xl mx-auto">{description}</p>
        </header>
    );
};

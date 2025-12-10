import React, { createContext, useContext, ReactNode } from 'react';

interface LayoutContextType {
  isInAdminPreview: boolean;
}

const LayoutContext = createContext<LayoutContextType>({
  isInAdminPreview: false,
});

export const useLayout = () => useContext(LayoutContext);

interface LayoutProviderProps {
  children: ReactNode;
  isInAdminPreview?: boolean;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ 
  children, 
  isInAdminPreview = false 
}) => {
  return (
    <LayoutContext.Provider value={{ isInAdminPreview }}>
      {children}
    </LayoutContext.Provider>
  );
};

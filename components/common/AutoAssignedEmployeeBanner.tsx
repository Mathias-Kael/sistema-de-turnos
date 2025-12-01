import React from 'react';
import { Employee } from '../../types';
import { imageStorage } from '../../services/imageStorage';

interface AutoAssignedEmployeeBannerProps {
  employee: Employee;
}

export const AutoAssignedEmployeeBanner: React.FC<AutoAssignedEmployeeBannerProps> = ({ employee }) => {
  const avatarUrl = employee.avatarUrl ? imageStorage.getImageUrl(employee.avatarUrl) : undefined;

  return (
    <div className="p-4 rounded-lg flex items-center space-x-4 border-2 border-primary bg-surface shadow-md mb-6">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={employee.name}
          className="w-16 h-16 rounded-full object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center text-secondary text-3xl shadow-inner">
          👤
        </div>
      )}
      <div>
        <p className="text-base text-primary">
          Tu turno será con <strong>{employee.name}</strong>.
        </p>
        <p className="text-sm text-secondary">
          Por favor, selecciona el día y la hora que prefieras.
        </p>
      </div>
    </div>
  );
};
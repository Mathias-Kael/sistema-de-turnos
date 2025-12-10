import React, { useState } from 'react';
import { Employee } from '../../types';
import { imageStorage } from '../../services/imageStorage';
import { ImageZoomModal } from './ImageZoomModal';

interface AutoAssignedEmployeeBannerProps {
  employee: Employee;
  business: import('../../types').Business;
}

export const AutoAssignedEmployeeBanner: React.FC<AutoAssignedEmployeeBannerProps> = ({ employee, business }) => {
  const avatarUrl = employee.avatarUrl ? imageStorage.getImageUrl(employee.avatarUrl) : undefined;
  const [zoomImageData, setZoomImageData] = useState<{ url: string; alt: string } | null>(null);

  const handleImageClick = (e: React.MouseEvent, imageUrl: string, altText: string) => {
    e.stopPropagation();
    setZoomImageData({ url: imageUrl, alt: altText });
  };

  return (
    <>
      <div className="p-4 rounded-lg flex items-center space-x-4 border-2 border-primary bg-surface shadow-md mb-6">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={employee.name}
            className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => handleImageClick(e, avatarUrl, employee.name)}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center text-secondary text-3xl shadow-inner">
            👤
          </div>
        )}
        <div>
          <p className="text-base text-primary">
            Tu turno será {business.branding?.terminology?.type === 'space' ? 'en' : 'con'} <strong>{employee.name}</strong>.
          </p>
          <p className="text-sm text-secondary">
            Por favor, selecciona el día y la hora que prefieras.
          </p>
        </div>
      </div>

      {zoomImageData && (
        <ImageZoomModal
          imageUrl={zoomImageData.url}
          altText={zoomImageData.alt}
          onClose={() => setZoomImageData(null)}
        />
      )}
    </>
  );
};
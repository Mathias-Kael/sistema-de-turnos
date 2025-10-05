import React, { useState, useRef, useEffect } from 'react';
import { Business } from '../../types';
import { imageStorage } from '../../services/imageStorage';

interface HeroSectionProps {
  business: Business;
  editable?: boolean;
  onEditCover?: () => void;
  onEditProfile?: () => void;
  onEditInfo?: (field: 'name' | 'description' | 'phone') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  business,
  editable = false,
  onEditCover,
  onEditProfile,
  onEditInfo,
}) => {
  // Estado para expansión de descripción en mobile
  const [showFullDescription, setShowFullDescription] = useState(false);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // Detección real de truncamiento visual
  useEffect(() => {
    const checkTruncation = () => {
      if (descRef.current) {
        const el = descRef.current;
        // Sólo interesa en modo colapsado; si está expandido no necesitamos botón "Ver más"
        if (!showFullDescription) {
          const clamped = el.scrollHeight > el.clientHeight + 2; // tolerancia
          setIsTruncated(clamped);
        } else {
          setIsTruncated(false);
        }
      }
    };
    // Timeout para esperar layout final (fuentes / imágenes)
    const t = setTimeout(checkTruncation, 0);
    window.addEventListener('resize', checkTruncation);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [business.description, showFullDescription]);
  const coverUrl = business.coverImageUrl
    ? imageStorage.getImageUrl(business.coverImageUrl)
    : undefined;

  const profileUrl = business.profileImageUrl
    ? imageStorage.getImageUrl(business.profileImageUrl)
    : undefined;

  return (
    <div className="relative mb-6">
  {/* Cover - Más bajo en móvil */}
  <div className="relative w-full h-48 md:h-64 z-0">
        {/* Capa interna con overflow-hidden */}
        <div className="absolute inset-0 rounded-lg overflow-hidden border-2 border-default bg-surface">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Portada"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary">
              Sin portada
            </div>
          )}
        </div>

        {/* Botón fuera del overflow-hidden */}
        {editable && onEditCover && (
          <button
            onClick={onEditCover}
            className="absolute bottom-4 right-4 z-20 bg-background text-primary px-4 py-2 rounded-lg shadow-lg hover:bg-surface transition flex items-center gap-2 border border-default"
          >
            📷 Editar Portada
          </button>
        )}
      </div>

      {/* Profile + Info */}
  {/* Aumentamos agresivamente el tamaño del avatar y ajustamos el solapamiento */}
  <div className="flex items-start gap-4 md:gap-6 px-4 md:px-6 -mt-20 md:-mt-32 relative z-10 pointer-events-none">
        {/* Profile Image */}
        <div className="relative flex-shrink-0">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={business.name}
              /* Tamaños anteriores: w-24 (96px) / md:w-40 (160px)
                 Requerido: >=128px móvil y >=200px desktop.
                 Elegimos w-32 (128px) y md:w-56 (~224px) para un salto claramente visible. */
              className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-background shadow-xl object-cover"
            />
          ) : (
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-background shadow-xl bg-surface flex items-center justify-center text-secondary text-sm">
              Sin foto
            </div>
          )}

          {editable && onEditProfile && (
            <button
              onClick={onEditProfile}
              className="absolute bottom-0 right-0 z-20 bg-background text-primary p-1.5 md:p-2 rounded-full shadow-lg hover:bg-surface transition border border-default pointer-events-auto"
              title="Editar foto de perfil"
            >
              📷
            </button>
          )}
        </div>

        {/* Business Info */}
        {/* Business Info */}
  {/* Ajustamos padding top para alinear texto aprox al centro vertical del nuevo avatar (mitad de 128 => 64 => pt-16; mitad de 224 => 112 => md:pt-28) */}
  <div className="flex-1 pt-20 md:pt-32 pointer-events-none">
          {/* Nombre */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-3xl font-bold text-primary break-words">
              {business.name}
            </h1>
            {editable && onEditInfo && (
              <button
                onClick={() => onEditInfo('name')}
                className="text-secondary hover:text-primary p-1 pointer-events-auto flex-shrink-0"
                title="Editar nombre"
              >
                ✏️
              </button>
            )}
          </div>

          {/* Descripción (truncada móvil) */}
          <div className="flex items-start gap-2 mt-1 pointer-events-none">
            <div className="relative flex-1 pointer-events-auto">
              <p
                ref={descRef}
                className={`text-secondary text-sm md:text-base transition-all ${
                  showFullDescription ? '' : 'line-clamp-2 md:line-clamp-none'
                }`}
              >
                {business.description}
              </p>
              {/* Botón Ver más / Ver menos basado en truncamiento real */}
              {!showFullDescription && isTruncated && (
                <button
                  onClick={() => setShowFullDescription(true)}
                  className="mt-1 text-xs font-medium text-primary hover:underline md:hidden"
                >
                  Ver más
                </button>
              )}
              {showFullDescription && (
                <button
                  onClick={() => setShowFullDescription(false)}
                  className="mt-1 text-xs font-medium text-primary hover:underline md:hidden"
                >
                  Ver menos
                </button>
              )}
            </div>
            {editable && onEditInfo && (
              <button
                onClick={() => onEditInfo('description')}
                className="text-secondary hover:text-primary p-1 pointer-events-auto flex-shrink-0"
                title="Editar descripción"
              >
                ✏️
              </button>
            )}
          </div>

          {/* Teléfono */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-secondary text-sm md:text-base">📞 {business.phone}</span>
            {editable && onEditInfo && (
              <button
                onClick={() => onEditInfo('phone')}
                className="text-secondary hover:text-primary p-1 pointer-events-auto"
                title="Editar teléfono"
              >
                ✏️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

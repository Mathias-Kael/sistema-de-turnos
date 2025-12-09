import React from 'react';
import { Business } from '../../types';
import { Star } from 'lucide-react';

interface RatingDisplayProps {
  business: Business;
}

/**
 * Componente que muestra la calificación de Google con estrellas
 * y un link "secreto" (sin indicador visual) hacia Google Maps
 */
export const RatingDisplay: React.FC<RatingDisplayProps> = ({ business }) => {
  const rating = business.branding?.rating;

  // No mostrar si no hay rating, no es visible, o no tiene score/count
  if (!rating || !rating.visible || !rating.score || !rating.count) {
    return null;
  }

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating.score);
    const hasHalfStar = rating.score % 1 >= 0.5;

    // Estrellas llenas
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className="w-5 h-5 fill-yellow-400 text-yellow-400"
        />
      );
    }

    // Media estrella
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative w-5 h-5">
          <Star className="w-5 h-5 text-gray-300 absolute" />
          <div className="overflow-hidden absolute w-1/2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    // Estrellas vacías
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className="w-5 h-5 text-gray-300"
        />
      );
    }

    return stars;
  };

  const content = (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        {renderStars()}
      </div>
      <p className="text-sm text-secondary">
        {rating.score.toFixed(1)} ({rating.count.toLocaleString()}{' '}
        {rating.count === 1 ? 'reseña' : 'reseñas'})
      </p>
    </div>
  );

  // Si hay URL de Google Maps, hacer el contenido clickeable (sin cursor pointer)
  if (rating.googleMapsUrl) {
    return (
      <a
        href={rating.googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        style={{ cursor: 'default' }}
      >
        {content}
      </a>
    );
  }

  // Sin URL, solo mostrar el rating
  return content;
};

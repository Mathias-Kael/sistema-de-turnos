import React from 'react';
const benefits = [
  {
    iconUrl: '/assets/icon-4.png',
    title: 'Clientes que regresan',
    description: 'Crea una experiencia de reserva tan intuitiva que tus clientes se sentirán valorados, no procesados.',
  },
  {
    iconUrl: '/assets/icon-3.png',
    title: '100% tu estilo',
    description: 'Desde el logo hasta el último pixel, ASTRA se convierte en un reflejo digital de tu identidad única.',
  },
  {
    iconUrl: '/assets/icon-2.png',
    title: 'Sin gestión manual',
    description: 'Las confirmaciones y recordatorios inteligentes trabajan por ti, construyendo confianza sin esfuerzo.',
  },
  {
    iconUrl: '/assets/icon-1.png',
    title: 'Más tiempo para crecer',
    description: 'Reemplaza el caos administrativo por un flujo de trabajo sereno que te devuelve el control de tu tiempo.',
  },
];

export const BenefitsSection: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-12">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="flex items-start gap-5">
          <img src={benefit.iconUrl} alt="" className="h-20 w-20 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{benefit.title}</h3>
            <p className="mt-1 text-gray-600 leading-relaxed">{benefit.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
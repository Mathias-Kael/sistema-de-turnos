import React from 'react';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Mica',
    business: 'Luna Beauty Studio',
    type: 'Salón de belleza',
    quote:
      'Es complicado andar copiando los datos del cliente todas las veces. Con ASTRA, solo pongo 4 números y ya está todo. Game changer.',
    rating: 5,
  },
  {
    name: 'Carlos',
    business: 'Arena Sport Club',
    type: 'Centro deportivo',
    quote:
      'Antes usábamos Excel. Era un caos. Ahora los clientes reservan solos las canchas y nosotros solo administramos. Cambio total.',
    rating: 5,
  },
  {
    name: 'Laura',
    business: 'Encanto Spacio',
    type: 'Spa & Estética',
    quote:
      'Lo que más me gusta es que se ve con MI marca. Mis clientes ni saben que uso ASTRA, ven mi logo y mis colores.',
    rating: 5,
  },
];

export const SocialProof: React.FC = () => {
  return (
    <section className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Negocios reales,{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              resultados reales
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            No son testimonios inventados. Son usuarios reales de la versión beta que ayudaron
            a construir ASTRA.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-shadow duration-300"
            >
              {/* Quote Icon */}
              <Quote className="w-10 h-10 text-blue-600 opacity-20 mb-4" />

              {/* Quote */}
              <p className="text-gray-700 leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </p>

              {/* Rating */}
              <div className="flex space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                  />
                ))}
              </div>

              {/* Author */}
              <div className="border-t border-gray-200 pt-4">
                <div className="font-semibold text-gray-900">{testimonial.name}</div>
                <div className="text-sm text-gray-600">{testimonial.business}</div>
                <div className="text-xs text-gray-500">{testimonial.type}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">7</div>
              <div className="text-sm opacity-90">Negocios activos</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">202+</div>
              <div className="text-sm opacity-90">Reservas procesadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">37</div>
              <div className="text-sm opacity-90">Clientes recurrentes</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-sm opacity-90">Uptime desde Oct 2025</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

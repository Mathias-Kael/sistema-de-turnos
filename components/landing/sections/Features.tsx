import React from 'react';
import {
  Calendar,
  Users,
  Palette,
  TrendingUp,
  Shield,
  CreditCard,
  Clock,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Scheduling Inteligente',
    description:
      'Algoritmo adaptativo que genera 30% más disponibilidad aprovechando gaps entre reservas. No más slots fijos desperdiciad os.',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Palette,
    title: '100% Tu Marca',
    description:
      'Personalización completa: colores, logo, tipografía. Tu cliente ve TU marca, no la nuestra. White-label real.',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: TrendingUp,
    title: 'Analytics en Vivo',
    description:
      'Dashboard dopaminérgico con métricas que importan: ingresos, servicios top, clientes frecuentes, trends históricos.',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    icon: Users,
    title: 'Clientes Recurrentes',
    description:
      'Autocomplete inteligente. 4 dígitos del teléfono → pre-fill completo. Reduce 60% el tiempo de crear reservas repetidas.',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  {
    icon: Shield,
    title: 'Seguridad Empresarial',
    description:
      'Multi-tenant con Row Level Security. PostgreSQL + JWT. 7 negocios activos, zero leaks. Infraestructura de banco.',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    icon: CreditCard,
    title: 'Pagos Flexibles',
    description:
      'Sistema de seña manual (efectivo/transferencia) o automático (Mercado Pago). Setup en 2 minutos, sin comisiones extra.',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    icon: Clock,
    title: 'Horarios 24/7',
    description:
      'Soporte nativo para negocios que cruzan medianoche. Gimnasios 24h, canchas nocturnas, eventos especiales.',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Sparkles,
    title: 'Categorización Visual',
    description:
      '12 íconos para servicios. Mejora 200% el descubrimiento. Cliente encuentra lo que busca en 10 segundos, no 30.',
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Características que{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              convierten
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            No es solo una agenda. Es tu herramienta de crecimiento con features pensadas
            desde la experiencia real de 7 negocios en producción.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover effect gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}
                />
              </div>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              30%
            </div>
            <div className="text-sm text-gray-600">Más disponibilidad</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              &lt;5min
            </div>
            <div className="text-sm text-gray-600">Setup completo</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              99.9%
            </div>
            <div className="text-sm text-gray-600">Uptime garantizado</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              202+
            </div>
            <div className="text-sm text-gray-600">Reservas procesadas</div>
          </div>
        </div>
      </div>
    </section>
  );
};

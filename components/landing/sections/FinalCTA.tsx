import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

const guarantees = [
  'Sin tarjeta de crédito',
  'Setup en 5 minutos',
  'Gratis para siempre (1 negocio)',
  'Cancela cuando quieras',
  'Soporte en español',
  '99.9% uptime garantizado',
];

export const FinalCTA: React.FC = () => {
  return (
    <section id="pricing" className="py-20 sm:py-32 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-center">
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-white mb-4">
                <Sparkles className="w-4 h-4" />
                <span>Plan Gratuito Permanente</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Empieza gratis hoy
              </h2>
              <p className="text-blue-100 text-lg">
                Todo lo que necesitas para gestionar tu negocio
              </p>
            </div>

            <div className="p-8 sm:p-12">
              {/* Price */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center space-x-2">
                  <span className="text-6xl font-bold text-gray-900">$0</span>
                  <span className="text-2xl text-gray-600">/mes</span>
                </div>
                <p className="text-gray-600 mt-2">
                  Para siempre. Sin trucos. Sin límites de reservas.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {guarantees.map((guarantee, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{guarantee}</span>
                  </div>
                ))}
              </div>

              {/* What's Included */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Incluye todo lo que necesitas:
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Scheduling inteligente</strong> con algoritmo adaptativo
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Branding 100% personalizable</strong> (logo, colores, tipografía)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Analytics dashboard</strong> con métricas en tiempo real
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Clientes recurrentes</strong> con autocomplete inteligente
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Sistema de pagos</strong> manual o automático
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>QR & links compartibles</strong> ilimitados
                    </span>
                  </li>
                </ul>
              </div>

              {/* CTA Button */}
              <Link
                to="/signup"
                className="block w-full text-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
              >
                <span className="flex items-center justify-center">
                  Crear Mi Agenda Gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </span>
              </Link>

              <p className="text-center text-sm text-gray-600 mt-4">
                Setup en 5 minutos • No se requiere tarjeta de crédito
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600 mb-6">Confiado por</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Arena Sport Club</div>
              <div className="text-2xl font-bold text-gray-400">Luna Beauty</div>
              <div className="text-2xl font-bold text-gray-400">Encanto Spacio</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

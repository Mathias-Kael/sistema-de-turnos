import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

export const DemoShowcase: React.FC = () => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <section id="demo" className="py-20 sm:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2 text-sm font-medium text-purple-700 mb-6">
            <Play className="w-4 h-4" />
            <span>Ver en acción</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            De cero a primera reserva{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              en minutos
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            No necesitas ser técnico. No necesitas tutoriales largos. Solo seguir 3 pasos
            simples y tu agenda estará lista.
          </p>
        </div>

        {/* Demo Preview Area */}
        <div className="relative max-w-5xl mx-auto">
          {/* Browser Window Mockup */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Browser Chrome */}
            <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2 border-b border-gray-200">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500 ml-4">
                demo.astraturnos.com
              </div>
            </div>

            {/* Demo Content */}
            <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 aspect-video flex items-center justify-center">
              {!isVideoPlaying ? (
                <div className="text-center space-y-6 p-8">
                  <div className="w-20 h-20 mx-auto bg-white rounded-full shadow-lg flex items-center justify-center">
                    <Play className="w-10 h-10 text-blue-600 ml-1" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Video Walkthrough Interactivo
                    </h3>
                    <p className="text-gray-600 mb-6">
                      90 segundos que muestran el setup completo
                    </p>
                    <button
                      onClick={() => setIsVideoPlaying(true)}
                      className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Ver Demo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <p className="text-white text-center">
                    [Video demo se integrará aquí]
                    <br />
                    <span className="text-sm text-gray-400">
                      Placeholder para el video walkthrough
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Floating Cards */}
          <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-gray-200 hidden lg:block">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Arena Sport Club
                </div>
                <div className="text-xs text-gray-600">Centro deportivo</div>
              </div>
            </div>
          </div>

          <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-4 border border-gray-200 hidden lg:block">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Luna Beauty Studio
                </div>
                <div className="text-xs text-gray-600">Salón de belleza</div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              1
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Crea tu cuenta
            </h3>
            <p className="text-gray-600 text-sm">
              Email y contraseña. Sin verificaciones complicadas. 30 segundos.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              2
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configura tu negocio
            </h3>
            <p className="text-gray-600 text-sm">
              Nombre, logo, colores, horarios. El sistema te guía paso a paso.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              3
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Comparte y recibe reservas
            </h3>
            <p className="text-gray-600 text-sm">
              QR, link directo, redes sociales. Tu agenda ya está funcionando.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/signup"
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
          >
            <span>Empezar Ahora</span>
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-4 text-sm text-gray-600">
            Sin tarjeta de crédito • Gratis para siempre (1 negocio)
          </p>
        </div>
      </div>
    </section>
  );
};

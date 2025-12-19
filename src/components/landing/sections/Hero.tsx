import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Sparkles, TrendingUp } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-60" />
      
      {/* Animated circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 text-sm font-medium text-blue-700">
              <Sparkles className="w-4 h-4" />
              <span>7 negocios activos • 202+ reservas procesadas</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              La agenda que se{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                adapta a tu negocio
              </span>
              , no al revés
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 leading-relaxed">
              Sistema profesional de reservas online con tu marca. Setup en 5 minutos.
              Sin tarjeta de crédito.
            </p>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  30% más reservas
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  100% tu marca
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Analytics en vivo
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
              >
                <span>Probar Gratis</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:shadow-lg transition-all duration-200"
              >
                Ver Demo
              </a>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white" />
                </div>
                <span>Usado por salones, spas y centros deportivos</span>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative lg:pl-8">
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              {/* Mock Dashboard Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" />
                  <div className="h-8 w-8 rounded-full bg-gray-100" />
                </div>
                
                <div className="space-y-3">
                  <div className="h-24 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-200 flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-blue-600 opacity-50" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 bg-green-50 rounded-lg border border-green-200" />
                    <div className="h-16 bg-yellow-50 rounded-lg border border-yellow-200" />
                    <div className="h-16 bg-blue-50 rounded-lg border border-blue-200" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>

              {/* Floating metrics */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-4 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">+30%</div>
                    <div className="text-xs text-gray-600">Más reservas</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl p-4 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">&lt;5min</div>
                    <div className="text-xs text-gray-600">Setup</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

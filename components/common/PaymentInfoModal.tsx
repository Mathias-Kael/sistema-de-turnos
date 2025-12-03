import React, { useState } from 'react';
import { Business, Service } from '../../types';
import { buildWhatsappUrl } from '../../utils/whatsapp';

type PaymentMethod = 'efectivo' | 'transferencia' | null;

interface WalletButton {
  name: string;
  icon: string;
  deepLink: string;
  webUrl: string;
}

interface PaymentInfoModalProps {
  business: Business;
  totalAmount: number;
  selectedServices: Service[];
  date: Date;
  slot: string;
  clientName: string;
  onConfirm: (method: PaymentMethod) => void;
  onCancel: () => void;
}

// Deep links correctos para billeteras argentinas
// Estas URLs abren las apps instaladas o redirigen a stores si no están instaladas
const WALLETS: WalletButton[] = [
  { 
    name: 'Mercado Pago', 
    icon: '💳', 
    // mercadopago://home abre la app directamente
    deepLink: 'mercadopago://home',
    webUrl: 'https://www.mercadopago.com.ar/home'
  },
  { 
    name: 'Ualá', 
    icon: '🔷', 
    // uala://open es el deep link correcto para Ualá
    deepLink: 'uala://open',
    webUrl: 'https://www.uala.com.ar/'
  },
  { 
    name: 'Personal Pay', 
    icon: '📱', 
    // personal-pay://home para Personal Pay
    deepLink: 'personal-pay://home',
    webUrl: 'https://www.personal.com.ar/Personas/Productos-y-Servicios/PersonalPay/'
  },
  { 
    name: 'Naranja X', 
    icon: '🟠', 
    // naranjax://home para Naranja X
    deepLink: 'naranjax://home',
    webUrl: 'https://www.naranjax.com/'
  },
];

export const PaymentInfoModal: React.FC<PaymentInfoModalProps> = ({
  business,
  totalAmount,
  selectedServices,
  date,
  slot,
  clientName,
  onConfirm,
  onCancel
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [copiedField, setCopiedField] = useState<'alias' | 'cbu' | null>(null);
  const [showWallets, setShowWallets] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleCopy = async (text: string, field: 'alias' | 'cbu') => {
    try {
      // Try Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setShowWallets(true);
        setCopyError(false);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        // Fallback: create temporary input element
        const tempInput = document.createElement('input');
        tempInput.value = text;
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.select();
        const success = document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        if (success) {
          setCopiedField(field);
          setShowWallets(true);
          setCopyError(false);
          setTimeout(() => setCopiedField(null), 2000);
        } else {
          setCopyError(true);
          setTimeout(() => setCopyError(false), 3000);
        }
      }
    } catch (error) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const handleWalletClick = (wallet: WalletButton) => {
    if (isMobile) {
      // Strategy mejorada para deep links en móvil
      // 1. Intentar abrir deep link
      // 2. Si falla o no responde en 1.5s, abrir URL web como fallback
      
      const deepLinkWindow = window.open(wallet.deepLink, '_blank');
      
      // Fallback: si después de 1.5s la app no se abrió, abrir web
      const fallbackTimer = setTimeout(() => {
        // Si el deep link no funcionó, abrir versión web
        if (deepLinkWindow) {
          deepLinkWindow.close();
        }
        window.open(wallet.webUrl, '_blank');
      }, 1500);
      
      // Si la ventana se cierra inmediatamente (app se abrió), cancelar fallback
      const checkInterval = setInterval(() => {
        if (deepLinkWindow && deepLinkWindow.closed) {
          clearTimeout(fallbackTimer);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Limpiar timeout después de 2s
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 2000);
    } else {
      // Desktop: siempre abrir versión web
      window.open(wallet.webUrl, '_blank');
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const handleConfirmMethod = () => {
    if (!selectedMethod) return;

    if (selectedMethod === 'efectivo') {
      // Redirigir directamente a WhatsApp con mensaje de efectivo
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const dateString = date.toLocaleDateString('es-AR', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      
      const targetPhone = business.whatsapp || business.phone;
      const message = `Hola! Voy a pagar la seña en efectivo para mi reserva de ${serviceNames} el ${dateString} a las ${slot}. Soy ${clientName}. ¿Confirman?`;
      
      const whatsappUrl = buildWhatsappUrl(targetPhone, message);
      window.open(whatsappUrl, '_blank');
      
      onConfirm('efectivo');
    }
  };

  const handleSendComprobante = () => {
    const serviceNames = selectedServices.map(s => s.name).join(', ');
    const dateString = date.toLocaleDateString('es-AR', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const targetPhone = business.whatsapp || business.phone;
    const message = `Hola! Envío comprobante de seña para mi reserva de ${serviceNames} el ${dateString} a las ${slot}. Soy ${clientName}.`;
    
    const whatsappUrl = buildWhatsappUrl(targetPhone, message);
    window.open(whatsappUrl, '_blank');
    
    onConfirm('transferencia');
  };

  // Safety check: si no hay datos de pago configurados
  if (!business.paymentAlias && !business.paymentCbu) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
        <div className="bg-surface rounded-lg shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-4">⚠️ Información no disponible</h2>
          <p className="text-secondary mb-6">
            Este negocio aún no ha configurado la información de pago. Por favor, contacte directamente.
          </p>
          <button
            onClick={onCancel}
            className="w-full bg-background hover:bg-background/80 px-4 py-3 rounded-lg font-medium transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <h2 className="text-2xl md:text-3xl font-bold mb-2">¿Cómo vas a pagar la seña?</h2>
        <p className="text-secondary mb-6">
          Selecciona tu método de pago preferido
        </p>

        {/* Método no seleccionado: mostrar opciones */}
        {!selectedMethod && (
          <div className="space-y-4">
            {/* Opción Efectivo */}
            <button
              onClick={() => handleMethodSelect('efectivo')}
              className="w-full border-2 border-border hover:border-primary rounded-lg p-6 transition-all hover:shadow-lg group"
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">💵</div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">Efectivo</h3>
                  <p className="text-secondary text-sm">Pagaré en el negocio</p>
                </div>
                <div className="text-primary text-2xl">→</div>
              </div>
            </button>

            {/* Opción Transferencia */}
            <button
              onClick={() => handleMethodSelect('transferencia')}
              className="w-full border-2 border-border hover:border-primary rounded-lg p-6 transition-all hover:shadow-lg group"
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">💳</div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">Transferencia</h3>
                  <p className="text-secondary text-sm">Pago ahora desde mi billetera</p>
                </div>
                <div className="text-primary text-2xl">→</div>
              </div>
            </button>

            {/* Botón Volver */}
            <button
              onClick={onCancel}
              className="w-full bg-background hover:bg-background/80 px-4 py-3 rounded-lg font-medium transition-colors mt-4"
            >
              Volver
            </button>
          </div>
        )}

        {/* Método Efectivo seleccionado */}
        {selectedMethod === 'efectivo' && (
          <div className="space-y-6">
            <div className="bg-background rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">💵</div>
              <h3 className="text-xl font-bold mb-2">Pago en Efectivo</h3>
              <p className="text-secondary">
                Confirmarás tu reserva y avisarás que pagarás la seña en el negocio.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMethod(null)}
                className="flex-1 bg-background hover:bg-background/80 px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmMethod}
                className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Confirmar y Avisar
              </button>
            </div>
          </div>
        )}

        {/* Método Transferencia seleccionado */}
        {selectedMethod === 'transferencia' && (
          <div className="space-y-6">
            <div className="bg-background rounded-lg p-6">
              <div className="text-4xl mb-3">💳</div>
              <h3 className="text-xl font-bold mb-4">Datos para Transferencia</h3>

              {/* Alias */}
              {business.paymentAlias && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary mb-2">Alias</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={business.paymentAlias}
                      readOnly
                      className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 font-mono text-sm"
                    />
                    <button
                      onClick={() => handleCopy(business.paymentAlias!, 'alias')}
                      className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      {copiedField === 'alias' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              {/* CBU */}
              {business.paymentCbu && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary mb-2">CBU</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={business.paymentCbu}
                      readOnly
                      className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 font-mono text-sm"
                    />
                    <button
                      onClick={() => handleCopy(business.paymentCbu!, 'cbu')}
                      className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      {copiedField === 'cbu' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Instrucciones adicionales */}
              {business.depositInfo && (
                <div className="bg-surface border border-border rounded-lg p-4 mb-4">
                  <p className="text-sm whitespace-pre-wrap">{business.depositInfo}</p>
                </div>
              )}

              {/* Error de copy */}
              {copyError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-red-500 text-sm">
                    Error al copiar. Por favor, selecciona y copia manualmente.
                  </p>
                </div>
              )}

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-2xl">⚠️</div>
                  <p className="text-sm">
                    <strong>Importante:</strong> Después de efectuar el pago, envía el comprobante por WhatsApp para confirmar tu reserva.
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Buttons */}
            {showWallets && (
              <div className="bg-background rounded-lg p-6 animate-fadeIn">
                <h4 className="font-bold mb-3 text-center">Abrir billetera</h4>
                <div className="grid grid-cols-2 gap-3">
                  {WALLETS.map(wallet => (
                    <button
                      key={wallet.name}
                      onClick={() => handleWalletClick(wallet)}
                      className="border-2 border-border hover:border-primary rounded-lg p-3 transition-all hover:shadow-md group"
                    >
                      <div className="text-3xl mb-1">{wallet.icon}</div>
                      <div className="text-sm font-medium group-hover:text-primary transition-colors">
                        {wallet.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMethod(null)}
                className="flex-1 bg-background hover:bg-background/80 px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleSendComprobante}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>📱</span>
                <span>Enviar Comprobante</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

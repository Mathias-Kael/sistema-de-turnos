import React, { useState } from 'react';
import { Business } from '../../types';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Input } from '../ui/Input';
import { validateCBU, validatePaymentAlias } from '../../utils/validation';

export const PaymentInfoEditor: React.FC = () => {
  const business = useBusinessState();
  const dispatch = useBusinessDispatch();
  
  const [formData, setFormData] = useState({
    paymentAlias: business.paymentAlias || '',
    paymentCbu: business.paymentCbu || '',
    depositInfo: business.depositInfo || ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (successMessage) setSuccessMessage('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar alias si está presente
    if (formData.paymentAlias.trim() && !validatePaymentAlias(formData.paymentAlias)) {
      newErrors.paymentAlias = 'Alias inválido. Debe tener entre 6-20 caracteres (letras, números, puntos o guiones)';
    }

    // Validar CBU si está presente
    if (formData.paymentCbu.trim() && !validateCBU(formData.paymentCbu)) {
      newErrors.paymentCbu = 'CBU inválido. Debe tener exactamente 22 dígitos';
    }

    // Al menos uno debe estar presente si depositInfo tiene contenido
    if (formData.depositInfo.trim() && !formData.paymentAlias.trim() && !formData.paymentCbu.trim()) {
      newErrors.paymentAlias = 'Debe configurar al menos Alias o CBU para usar instrucciones de depósito';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setSuccessMessage('');

    try {
      const updatedBusiness: Business = {
        ...business,
        paymentAlias: formData.paymentAlias.trim() || undefined,
        paymentCbu: formData.paymentCbu.trim() || undefined,
        depositInfo: formData.depositInfo.trim() || undefined,
      };

      await dispatch({
        type: 'UPDATE_BUSINESS',
        payload: updatedBusiness
      });

      setSuccessMessage('✓ Información de pago guardada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrors({ general: error.message || 'Error al guardar la información de pago' });
    } finally {
      setIsSaving(false);
    }
  };

  const hasPaymentData = formData.paymentAlias.trim() || formData.paymentCbu.trim();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-primary mb-2">Información de Pago</h3>
        <p className="text-secondary text-sm">
          Configure los datos bancarios para que los clientes puedan pagar la seña de servicios que lo requieran.
        </p>
      </div>

      <div className="bg-background rounded-lg p-6 space-y-5">
        {/* Alias */}
        <div>
          <Input
            label="Alias de Mercado Pago / CVU"
            type="text"
            value={formData.paymentAlias}
            onChange={(e) => handleChange('paymentAlias', e.target.value)}
            placeholder="salon.maria.mp"
            maxLength={20}
          />
          {errors.paymentAlias && (
            <p className="text-red-500 text-sm mt-1">{errors.paymentAlias}</p>
          )}
          <p className="text-secondary text-xs mt-1">
            Entre 6-20 caracteres. Solo letras, números, puntos y guiones.
          </p>
        </div>

        {/* CBU */}
        <div>
          <Input
            label="CBU (Clave Bancaria Uniforme)"
            type="text"
            value={formData.paymentCbu}
            onChange={(e) => handleChange('paymentCbu', e.target.value)}
            placeholder="0000003100012345678901"
            maxLength={22}
          />
          {errors.paymentCbu && (
            <p className="text-red-500 text-sm mt-1">{errors.paymentCbu}</p>
          )}
          <p className="text-secondary text-xs mt-1">
            Exactamente 22 dígitos numéricos.
          </p>
        </div>

        {/* Instrucciones adicionales */}
        <div>
          <label className="block font-medium text-primary mb-2">
            Instrucciones de Depósito (Opcional)
          </label>
          <textarea
            value={formData.depositInfo}
            onChange={(e) => handleChange('depositInfo', e.target.value)}
            placeholder="Ejemplo: Transferir el 50% del total como seña. Una vez realizado el pago, enviar comprobante por WhatsApp para confirmar la reserva."
            className="w-full px-4 py-3 border border-default rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={4}
            maxLength={500}
          />
          <p className="text-secondary text-xs mt-1">
            {formData.depositInfo.length}/500 caracteres. Este texto se mostrará a los clientes.
          </p>
        </div>

        {/* Warning si no hay datos */}
        {!hasPaymentData && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-xl">⚠️</div>
              <div className="text-sm">
                <strong className="block mb-1">Sin datos de pago configurados</strong>
                <p className="text-secondary">
                  Configure al menos un Alias o CBU para que los clientes puedan pagar la seña de servicios que lo requieran.
                  Los servicios marcados con "Requiere depósito" necesitan esta información.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-600 font-medium text-sm">{successMessage}</p>
          </div>
        )}

        {/* Error general */}
        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-500 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Botón guardar */}
        <div className="pt-4 border-t border-default">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Guardar Información de Pago'}
          </button>
        </div>
      </div>

      {/* Info adicional */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-xl">💡</div>
          <div className="text-sm text-secondary">
            <strong className="block mb-1 text-primary">Tip:</strong>
            Los clientes verán esta información cuando reserven un servicio que requiera seña.
            Podrán copiar el alias/CBU y se les mostrarán botones para abrir sus billeteras virtuales (Mercado Pago, Ualá, etc.).
          </div>
        </div>
      </div>
    </div>
  );
};

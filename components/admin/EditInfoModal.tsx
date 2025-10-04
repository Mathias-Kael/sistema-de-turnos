import React, { useState } from 'react';

interface EditInfoModalProps {
  field: 'name' | 'description' | 'phone';
  currentValue: string;
  onSave: (newValue: string) => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<EditInfoModalProps['field'], string> = {
  name: 'Nombre del Negocio',
  description: 'Descripción',
  phone: 'Teléfono (WhatsApp)',
};

const FIELD_PLACEHOLDERS: Record<EditInfoModalProps['field'], string> = {
  name: 'Ej: Fitness "Tu cuerpo sabroso"',
  description: 'Ej: Un lugar para sudar sabroso',
  phone: 'Ej: 3765006395',
};

export const EditInfoModal: React.FC<EditInfoModalProps> = ({
  field,
  currentValue,
  onSave,
  onClose,
}) => {
  const [value, setValue] = useState(currentValue);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 border border-default">
        <h3 className="text-lg font-bold text-primary mb-4">
          Editar {FIELD_LABELS[field]}
        </h3>

        {field === 'description' ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={FIELD_PLACEHOLDERS[field]}
            className="w-full p-3 border border-default rounded-lg bg-surface text-primary focus:border-primary focus:outline-none"
            rows={4}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={FIELD_PLACEHOLDERS[field]}
            className="w-full p-3 border border-default rounded-lg bg-surface text-primary focus:border-primary focus:outline-none"
            autoFocus
          />
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-default rounded-lg hover:bg-surface transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary text-brand-text rounded-lg hover:opacity-90 transition disabled:opacity-50"
            disabled={!value.trim()}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, useMemo } from 'react';
import { ResourceTerminology, ResourceType, CategoryIcon, ResourceLabels } from '../types';

// Presets de configuración para facilitar la selección
const TERMINOLOGY_PRESETS: Record<string, ResourceTerminology> = {
  // --- PERSONAS ---
  'professional': {
    type: 'person',
    categoryIcon: 'briefcase',
    labels: { singular: 'Profesional', plural: 'Profesionales', action: 'Reservar con' },
    isCustom: false
  },
  'doctor': {
    type: 'person',
    categoryIcon: 'heart',
    labels: { singular: 'Especialista', plural: 'Especialistas', action: 'Agendar con' },
    isCustom: false
  },
  'stylist': {
    type: 'person',
    categoryIcon: 'brush', // Mapeado a brush ya que scissors no está en CategoryIcon
    labels: { singular: 'Estilista', plural: 'Estilistas', action: 'Reservar con' },
    isCustom: false
  },
  'teacher': {
    type: 'person',
    categoryIcon: 'academic',
    labels: { singular: 'Profesor', plural: 'Profesores', action: 'Clase con' },
    isCustom: false
  },

  // --- ESPACIOS ---
  'court': {
    type: 'space',
    categoryIcon: 'trophy',
    labels: { singular: 'Cancha', plural: 'Canchas', action: 'Reservar' },
    isCustom: false
  },
  'room': {
    type: 'space',
    categoryIcon: 'home',
    labels: { singular: 'Sala', plural: 'Salas', action: 'Reservar en' },
    isCustom: false
  },
  'studio': {
    type: 'space',
    categoryIcon: 'music',
    labels: { singular: 'Estudio', plural: 'Estudios', action: 'Reservar' },
    isCustom: false
  },
  'box': {
    type: 'space',
    categoryIcon: 'trophy',
    labels: { singular: 'Box', plural: 'Boxes', action: 'Reservar' },
    isCustom: false
  }
};

const DEFAULT_TERMINOLOGY: ResourceTerminology = TERMINOLOGY_PRESETS['professional'];

export const useResourceTerminology = (initialConfig?: ResourceTerminology) => {
  const [config, setConfig] = useState<ResourceTerminology>(initialConfig || DEFAULT_TERMINOLOGY);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>('professional');

  // Actualizar el preset seleccionado cuando cambia el tipo
  const setResourceType = (type: ResourceType) => {
    if (type === config.type) return;

    // Cambiar a un default sensato para el nuevo tipo
    const newPresetKey = type === 'person' ? 'professional' : 'court';
    const newPreset = TERMINOLOGY_PRESETS[newPresetKey];
    
    setConfig(newPreset);
    setSelectedPresetKey(newPresetKey);
  };

  // Aplicar un preset específico
  const applyPreset = (presetKey: string) => {
    if (TERMINOLOGY_PRESETS[presetKey]) {
      setConfig(TERMINOLOGY_PRESETS[presetKey]);
      setSelectedPresetKey(presetKey);
    }
  };

  // Personalización manual de etiquetas
  const updateLabels = (labels: Partial<ResourceLabels>) => {
    setConfig(prev => ({
      ...prev,
      labels: { ...prev.labels, ...labels },
      isCustom: true
    }));
    setSelectedPresetKey(null); // Ya no es un preset puro
  };

  // Actualizar icono
  const updateIcon = (icon: CategoryIcon) => {
    setConfig(prev => ({
      ...prev,
      categoryIcon: icon,
      isCustom: true
    }));
  };

  // Helpers derivados para la UI
  const uiHelpers = useMemo(() => ({
    questionText: config.type === 'person' 
      ? `¿Con qué ${config.labels.singular.toLowerCase()} quieres atenderte?`
      : `¿Qué ${config.labels.singular.toLowerCase()} quieres reservar?`,
    
    placeholderText: config.type === 'person'
      ? `Ej: Juan Pérez`
      : `Ej: Cancha 1`,
      
    actionButtonText: `${config.labels.action} ${config.labels.singular}`
  }), [config]);

  return {
    config,
    selectedPresetKey,
    setResourceType,
    applyPreset,
    updateLabels,
    updateIcon,
    uiHelpers,
    presets: TERMINOLOGY_PRESETS
  };
};
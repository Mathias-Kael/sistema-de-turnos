// utils/flyerTypes.ts

/**
 * Datos necesarios para generar un flyer
 */
export interface FlyerData {
  businessName: string;
  logo?: string;              // URL o data URL del logo
  backgroundColor: string;    // Color de fondo (hex)
  textColor: string;         // Color de texto (hex)
  qrCodeDataURL: string;     // QR generado como data URL
  linkPlaceholder: string;   // Texto mostrado en el espacio del link
}

/**
 * Template de flyer con función de renderizado
 */
export interface FlyerTemplate {
  id: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
  render: (ctx: CanvasRenderingContext2D, data: FlyerData) => Promise<void>;
}

/**
 * Opciones para la generación de flyers
 */
export interface FlyerGenerationOptions {
  template: FlyerTemplate;
  data: FlyerData;
  format: 'png' | 'jpeg';
  quality: number;            // 0.0 - 1.0
}

/**
 * Resultado de la generación de flyer
 */
export interface FlyerGenerationResult {
  success: boolean;
  dataURL?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    size: number;             // Bytes aproximados
    template: string;         // ID del template usado
  };
}

/**
 * Especificaciones técnicas del template básico
 */
export const BASIC_TEMPLATE_SPECS = {
  canvas: {
    width: 1080,
    height: 1080,
  },
  
  header: {
    height: 180,
    logo: {
      size: 120,
      position: { x: 60, y: 30 },
      fallbackEmoji: '🏢'
    },
    businessName: {
      fontSize: 48,
      fontWeight: 'bold' as const,
      position: { x: 200, y: 90 },
      maxWidth: 800
    }
  },
  
  body: {
    y: 180,
    height: 600,
    padding: 60,
    text: {
      fontSize: 36,
      lineHeight: 60,
      align: 'center' as const,
      maxWidth: 900
    },
    linkPlaceholder: {
      text: '________________',
      fontSize: 32,
      style: 'underline' as const
    }
  },
  
  footer: {
    y: 780,
    height: 300,
    qr: {
      size: 250,
      position: { x: 415, y: 800 } // Centrado en 1080px
    }
  },
  
  export: {
    format: 'image/png' as const,
    quality: 0.92
  }
} as const;
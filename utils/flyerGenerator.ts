// utils/flyerGenerator.ts

import QRCode from 'qrcode';
import { FlyerData, FlyerGenerationResult, BASIC_TEMPLATE_SPECS } from './flyerTypes';
import { renderModernTemplate, renderElegantTemplate, renderMinimalistTemplate } from './flyerTemplates';

/**
 * Clase utilitaria para generar flyers promocionales usando Canvas API
 */
export class FlyerGenerator {
  
  /**
   * Genera QR code como data URL
   */
  static async generateQRCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, { 
        width: BASIC_TEMPLATE_SPECS.footer.qr.size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      throw new Error(`Error al generar QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Carga imagen desde URL y retorna como Image element
   */
  static async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      img.src = url;
      
      // Timeout de 5 segundos para evitar cuelgues
      setTimeout(() => {
        reject(new Error(`Timeout loading image: ${url}`));
      }, 5000);
    });
  }

  /**
   * Dibuja texto con ajuste automático de tamaño si es muy largo
   */
  static drawFittedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    baseFontSize: number
  ): void {
    let fontSize = baseFontSize;
    let textWidth: number;
    
    do {
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      textWidth = ctx.measureText(text).width;
      if (textWidth > maxWidth) {
        fontSize -= 2;
      }
    } while (textWidth > maxWidth && fontSize > 20);
    
    ctx.fillText(text, x, y);
  }

  /**
   * Dibuja texto multilínea centrado
   */
  static drawMultilineText(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    x: number,
    startY: number,
    lineHeight: number
  ): void {
    let currentY = startY;
    
    lines.forEach(line => {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    });
  }


  /**
   * Genera flyer completo y retorna data URL
   */
  static async generateFlyer(data: FlyerData, templateId: 'modern' | 'elegant' | 'minimalist'): Promise<FlyerGenerationResult> {
    try {
      // Validaciones básicas
      if (!data.businessName.trim()) {
        throw new Error('Nombre del negocio es requerido');
      }
      
      if (!data.qrCodeDataURL) {
        throw new Error('QR Code es requerido');
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      canvas.width = 1080;
      canvas.height = 1080;

      // Seleccionar y ejecutar la función de renderizado del template
      switch (templateId) {
        case 'modern':
          await renderModernTemplate(ctx, data);
          break;
        case 'elegant':
          await renderElegantTemplate(ctx, data);
          break;
        case 'minimalist':
          await renderMinimalistTemplate(ctx, data);
          break;
        default:
          throw new Error(`Template '${templateId}' no reconocido.`);
      }

      const specs = BASIC_TEMPLATE_SPECS;
      const dataURL = canvas.toDataURL(specs.export.format, specs.export.quality);
      
      // Calcular tamaño aproximado del archivo
      const base64Length = dataURL.split(',')[1].length;
      const sizeBytes = Math.round((base64Length * 3) / 4);

      return {
        success: true,
        dataURL,
        metadata: {
          width: specs.canvas.width,
          height: specs.canvas.height,
          size: sizeBytes,
          template: templateId
        }
      };
    } catch (error) {
      console.error('Error generating flyer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al generar flyer'
      };
    }
  }

  /**
   * Crea el nombre de archivo para download
   */
  static createFileName(businessName: string): string {
    const cleanName = businessName
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .toLowerCase()
      .substring(0, 20); // Limitar longitud más agresivamente
    
    const timestamp = Date.now();
    return `flyer-${cleanName}-${timestamp}.png`;
  }

  /**
   * Descargar flyer como archivo PNG
   */
  static downloadFlyer(dataURL: string, fileName: string): void {
    try {
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading flyer:', error);
      throw new Error('Error al descargar el flyer');
    }
  }
}
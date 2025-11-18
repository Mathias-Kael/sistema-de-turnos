// utils/flyerGenerator.ts

import QRCode from 'qrcode';
import { FlyerData, FlyerGenerationResult, BASIC_TEMPLATE_SPECS } from './flyerTypes';

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
   * Renderiza el template básico en canvas
   */
  static async renderBasicTemplate(
    canvas: HTMLCanvasElement,
    data: FlyerData
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const specs = BASIC_TEMPLATE_SPECS;

    // Configurar dimensiones
    canvas.width = specs.canvas.width;
    canvas.height = specs.canvas.height;

    // 1. Fondo
    ctx.fillStyle = data.backgroundColor;
    ctx.fillRect(0, 0, specs.canvas.width, specs.canvas.height);

    // 2. Header: Logo + Nombre
    ctx.fillStyle = data.textColor;
    ctx.textAlign = 'left';
    
    // Logo
    if (data.logo) {
      try {
        const logoImg = await this.loadImage(data.logo);
        const logoSize = specs.header.logo.size;
        const logoPos = specs.header.logo.position;
        
        // Mantener aspect ratio del logo
        const aspectRatio = logoImg.width / logoImg.height;
        let drawWidth = logoSize;
        let drawHeight = logoSize;
        
        if (aspectRatio > 1) {
          drawHeight = logoSize / aspectRatio;
        } else {
          drawWidth = logoSize * aspectRatio;
        }
        
        // Centrar el logo en el espacio disponible
        const offsetX = (logoSize - drawWidth) / 2;
        const offsetY = (logoSize - drawHeight) / 2;
        
        ctx.drawImage(
          logoImg, 
          logoPos.x + offsetX, 
          logoPos.y + offsetY, 
          drawWidth, 
          drawHeight
        );
      } catch (error) {
        console.warn('Error loading logo, using fallback:', error);
        // Fallback: emoji placeholder
        ctx.font = 'bold 80px Arial';
        ctx.fillText(specs.header.logo.fallbackEmoji, specs.header.logo.position.x, specs.header.logo.position.y + 80);
      }
    } else {
      // Sin logo: usar placeholder emoji
      ctx.font = 'bold 80px Arial';
      ctx.fillText(specs.header.logo.fallbackEmoji, specs.header.logo.position.x, specs.header.logo.position.y + 80);
    }

    // Nombre del negocio con ajuste automático de tamaño
    ctx.textAlign = 'left';
    ctx.fillStyle = data.textColor;
    this.drawFittedText(
      ctx,
      data.businessName,
      specs.header.businessName.position.x,
      specs.header.businessName.position.y,
      specs.header.businessName.maxWidth,
      specs.header.businessName.fontSize
    );

    // 3. Body: Mensaje promocional
    ctx.textAlign = 'center';
    ctx.font = `${specs.body.text.fontSize}px Arial, sans-serif`;
    
    const messageLines = [
      'Conocé nuestros servicios',
      'en ' + data.linkPlaceholder,
      'y reservá tu cita cuando',
      'quieras. Disponible 24/7'
    ];

    const centerX = specs.canvas.width / 2;
    const startY = specs.body.y + 100; // Empezar un poco más abajo
    
    this.drawMultilineText(ctx, messageLines, centerX, startY, specs.body.text.lineHeight);

    // 4. Footer: QR Code
    if (data.qrCodeDataURL) {
      try {
        const qrImg = await this.loadImage(data.qrCodeDataURL);
        const qrPos = specs.footer.qr.position;
        const qrSize = specs.footer.qr.size;
        
        ctx.drawImage(qrImg, qrPos.x, qrPos.y, qrSize, qrSize);
      } catch (error) {
        console.warn('Error loading QR code:', error);
        // Fallback: dibujar placeholder
        ctx.strokeStyle = data.textColor;
        ctx.lineWidth = 2;
        const qrPos = specs.footer.qr.position;
        const qrSize = specs.footer.qr.size;
        ctx.strokeRect(qrPos.x, qrPos.y, qrSize, qrSize);
        ctx.fillStyle = data.textColor;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', qrPos.x + qrSize/2, qrPos.y + qrSize/2);
      }
    }
  }

  /**
   * Genera flyer completo y retorna data URL
   */
  static async generateFlyer(data: FlyerData): Promise<FlyerGenerationResult> {
    try {
      // Validaciones básicas
      if (!data.businessName.trim()) {
        throw new Error('Nombre del negocio es requerido');
      }
      
      if (!data.qrCodeDataURL) {
        throw new Error('QR Code es requerido');
      }

      const canvas = document.createElement('canvas');
      await this.renderBasicTemplate(canvas, data);

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
          template: 'basic'
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
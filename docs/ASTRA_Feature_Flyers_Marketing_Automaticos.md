# 📊 ASTRA - Feature: Flyers Automáticos para Marketing

**Fecha:** 18 Noviembre 2025  
**Autor:** Claude (Architect Mode)  
**Estado:** 🔄 En Planificación  
**Versión:** 1.0

---

## 🎯 RESUMEN EJECUTIVO

### **OBJETIVO**
Implementar generador automático de flyers promocionales branded para estados de WhatsApp/Instagram, permitiendo a usuarios crear contenido visual profesional sin necesidad de diseñadores o herramientas externas.

### **VALOR DE NEGOCIO**
- **Para el negocio:** Contenido marketing listo para compartir en segundos
- **Para los clientes:** Mayor visibilidad en RRSS → más reservas
- **Para ASTRA:** Feature diferenciadora vs competencia

### **SCOPE MVP**
- 1 template predefinido (Instagram square 1080x1080)
- Generación automática con datos del negocio
- Download PNG optimizado para RRSS
- Integración en pestaña "Compartir" existente

---

## 📋 ESPECIFICACIONES DE REQUERIMIENTOS

### **FUNCIONALES**

#### **RF-1: Prerequisitos para generar flyer**
- **Condición:** Link público (`shareToken`) debe estar generado y activo
- **Validación:** El botón "Generar Flyer" solo aparece si existe `shareToken` activo
- **Flujo alternativo:** Usuario debe generar link primero desde la misma pestaña

#### **RF-2: Template único MVP**
**Elementos visuales:**
- **Fondo:** Color primario del negocio (`business.branding.primaryColor`)
- **Logo:** `business.profileImageUrl` (si existe, sino placeholder genérico)
- **Nombre negocio:** `business.name`
- **Texto promocional:** Fijo: "Conocé nuestros servicios en [ESPACIO PARA LINK] y reservá tu cita cuando quieras. Disponible 24/7"
- **Espacio para link:** Placeholder visual editable por usuario en WhatsApp/Instagram
- **QR Code:** Mismo QR que pestaña Compartir (apunta a link público)

**Dimensiones:** 1080x1080px (Instagram square format)

#### **RF-3: Selector de colores (OPCIONAL - FASE 2)**
Matías preguntó: "¿Se podría colocar un selector de colores?"

**RECOMENDACIÓN ARQUITECTO:**
- ✅ **SÍ, pero en Fase 2** (no MVP)
- **Razón:** Aumenta complejidad UI/UX y testing significativamente
- **MVP approach:** Usar branding actual del negocio (ya configurado)
- **Fase 2:** Agregar picker de color para override temporal del fondo

#### **RF-4: Generación y download**
- **Trigger:** Click en botón "Generar Flyer"
- **Proceso:**
  1. Renderizar template en Canvas oculto
  2. Convertir a PNG vía `canvas.toDataURL()`
  3. Descargar archivo automáticamente
- **Nombre archivo:** `flyer-${businessName}-${timestamp}.png`

### **NO FUNCIONALES**

#### **NFR-1: Performance**
- **Target:** Generación < 2 segundos
- **Optimización:** Canvas nativo (sin libraries pesadas)
- **Carga inicial:** Lazy load del componente

#### **NFR-2: Calidad de imagen**
- **Resolución:** 1080x1080 (Instagram optimal)
- **Formato:** PNG (soporta transparencia para logos)
- **Compresión:** Calidad 0.92 (balance size/quality)

#### **NFR-3: Compatibilidad**
- **Browsers:** Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- **Mobile:** Responsive preview en modal
- **Dispositivos:** Desktop + Mobile (download funcional ambos)

---

## 🏗️ ARQUITECTURA TÉCNICA

### **DECISIÓN 1: Canvas Library**

#### **OPCIONES EVALUADAS**

| Library | Pros | Contras | Recomendación |
|---------|------|---------|---------------|
| **HTML5 Canvas Nativo** | ✅ Zero dependencies<br>✅ Ya usado en proyecto (ImageProcessor)<br>✅ Performance óptimo<br>✅ Control total | ❌ Más código manual | ⭐ **RECOMENDADO** |
| **Konva.js (130KB)** | ✅ API declarativa<br>✅ Fácil debugging | ❌ Overhead innecesario para 1 template<br>❌ +130KB bundle | ❌ No justificado para MVP |
| **Fabric.js (280KB)** | ✅ Muy completo<br>✅ Interactive canvas | ❌ +280KB bundle<br>❌ Overkill para static export | ❌ Sobrekill |

**DECISIÓN FINAL:** 
```
✅ HTML5 Canvas API Nativo
```

**JUSTIFICACIÓN:**
1. **Proyecto ya usa Canvas:** `ImageProcessor` clase existente con Canvas
2. **Use case simple:** Render estático → export PNG (no interactividad)
3. **Bundle size:** Zero dependencies adicionales
4. **Expertise disponible:** Código existente como referencia

**CÓDIGO DE REFERENCIA EXISTENTE:**
- [`utils/imageProcessing.ts`](utils/imageProcessing.ts:75) - Canvas rendering
- `QRCode` library ya en proyecto (usado en SharePanel)

---

### **DECISIÓN 2: Estructura de Componentes**

```
components/admin/
├── SharePanel.tsx              # Componente padre (YA EXISTE)
│   └── FlyerGenerator.tsx      # NUEVO: Botón + Modal
│       └── FlyerCanvas.tsx     # NUEVO: Canvas + Templates
│
utils/
└── flyerGenerator.ts           # NUEVO: Lógica de renderizado
```

#### **RESPONSABILIDADES**

**`SharePanel.tsx`** (Modificar mínimamente)
```typescript
// Solo agregar condicional render
{hasActiveShareToken && <FlyerGenerator />}
```

**`FlyerGenerator.tsx`** (NUEVO)
- Estado del modal (open/closed)
- Trigger de generación
- Preview del flyer
- Botón de download

**`FlyerCanvas.tsx`** (NUEVO)
- Renderizar template en Canvas
- Convertir a PNG
- Exponer método `generateImage()`

**`utils/flyerGenerator.ts`** (NUEVO)
- Funciones puras de rendering
- Cálculos de layout
- Generación de QR (wrapper sobre qrcode lib)

---

### **DECISIÓN 3: State Management**

**APPROACH:** Local state (React useState)

**DATOS NECESARIOS (ya disponibles via `useBusinessState()`):**
```typescript
const business = useBusinessState();

// Datos requeridos:
const {
  name,                    // Nombre del negocio
  profileImageUrl,         // Logo (opcional)
  branding: {
    primaryColor,          // Color de fondo
    textColor              // Color de texto
  },
  shareToken               // Token para generar QR/link
} = business;
```

**NO REQUIERE:**
- Redux/Zustand (scope limitado)
- Context adicional (usa BusinessContext existente)
- Backend storage (generación client-side)

---

## 🎨 DISEÑO DEL TEMPLATE MVP

### **LAYOUT ESPECIFICACIÓN**

```
┌─────────────────────────────────────┐  1080px
│  ┌───────────────────────────────┐  │
│  │   HEADER (Logo + Nombre)      │  │  180px
│  │   [LOGO]  Mi Negocio          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   BODY (Mensaje promocional)  │  │  600px
│  │                               │  │
│  │   Conocé nuestros servicios   │  │
│  │   en [ESPACIO LINK EDITABLE]  │  │
│  │   y reservá tu cita cuando    │  │
│  │   quieras. Disponible 24/7    │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      FOOTER (QR Code)         │  │  300px
│  │                               │  │
│  │       [QR CODE 250x250]       │  │
│  │                               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### **ESPECIFICACIONES TÉCNICAS**

```typescript
const TEMPLATE_SPECS = {
  canvas: {
    width: 1080,
    height: 1080,
  },
  
  header: {
    height: 180,
    logo: {
      size: 120,
      position: { x: 60, y: 30 },
      fallback: '🏢' // Emoji placeholder si no hay logo
    },
    businessName: {
      fontSize: 48,
      fontWeight: 'bold',
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
      lineHeight: 1.6,
      align: 'center',
      maxWidth: 900
    },
    linkPlaceholder: {
      text: '________________',
      fontSize: 32,
      style: 'underline'
    }
  },
  
  footer: {
    y: 780,
    height: 300,
    qr: {
      size: 250,
      position: { x: 415, y: 800 } // Centrado
    }
  },
  
  export: {
    format: 'image/png',
    quality: 0.92
  }
};
```

---

## 📦 FILE STRUCTURE DETALLADA

### **NUEVOS ARCHIVOS**

```
components/admin/flyer/
├── FlyerGenerator.tsx          # Modal + UI controls
├── FlyerCanvas.tsx             # Canvas rendering component
└── FlyerTemplateBasic.tsx      # Template 1 (MVP)

utils/
├── flyerGenerator.ts           # Core generation logic
└── flyerTypes.ts               # TypeScript types

types.ts                         # Agregar tipos globales
```

### **ARCHIVOS A MODIFICAR**

```
components/admin/SharePanel.tsx  # Agregar <FlyerGenerator />
package.json                     # Sin cambios (qrcode ya existe)
```

---

## 🔧 IMPLEMENTACIÓN DETALLADA

### **TIPOS TYPESCRIPT**

```typescript
// utils/flyerTypes.ts

export interface FlyerTemplate {
  id: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
  render: (ctx: CanvasRenderingContext2D, data: FlyerData) => void;
}

export interface FlyerData {
  businessName: string;
  logo?: string;              // URL o data URL
  backgroundColor: string;
  textColor: string;
  qrCodeDataURL: string;      // QR generado previamente
  linkPlaceholder: string;    // Texto mostrado en el espacio del link
}

export interface FlyerGenerationOptions {
  template: FlyerTemplate;
  data: FlyerData;
  format: 'png' | 'jpeg';
  quality: number;            // 0.0 - 1.0
}

export interface FlyerGenerationResult {
  success: boolean;
  dataURL?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    size: number;             // Bytes
  };
}
```

---

### **CORE UTILITY: flyerGenerator.ts**

```typescript
// utils/flyerGenerator.ts

import QRCode from 'qrcode';
import { FlyerData, FlyerGenerationResult, FlyerTemplate } from './flyerTypes';

export class FlyerGenerator {
  
  /**
   * Genera QR code como data URL
   */
  static async generateQRCode(url: string): Promise<string> {
    return await QRCode.toDataURL(url, { 
      width: 250,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
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
    });
  }

  /**
   * Dibuja texto con word wrap automático
   */
  static drawMultilineText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
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

    // Configurar dimensiones
    canvas.width = 1080;
    canvas.height = 1080;

    // 1. Fondo
    ctx.fillStyle = data.backgroundColor;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Header: Logo + Nombre
    ctx.fillStyle = data.textColor;
    ctx.textAlign = 'left';
    
    // Logo
    if (data.logo) {
      try {
        const logoImg = await this.loadImage(data.logo);
        ctx.drawImage(logoImg, 60, 30, 120, 120);
      } catch {
        // Fallback: emoji placeholder
        ctx.font = 'bold 80px Arial';
        ctx.fillText('🏢', 60, 120);
      }
    } else {
      ctx.font = 'bold 80px Arial';
      ctx.fillText('🏢', 60, 120);
    }

    // Nombre del negocio
    ctx.font = 'bold 48px Arial';
    ctx.fillText(data.businessName, 200, 90);

    // 3. Body: Mensaje promocional
    ctx.textAlign = 'center';
    ctx.font = '36px Arial';
    
    const messageLines = [
      'Conocé nuestros servicios',
      'en ' + data.linkPlaceholder,
      'y reservá tu cita cuando',
      'quieras. Disponible 24/7'
    ];

    let textY = 300;
    messageLines.forEach(line => {
      ctx.fillText(line, 540, textY);
      textY += 60;
    });

    // 4. Footer: QR Code
    if (data.qrCodeDataURL) {
      const qrImg = await this.loadImage(data.qrCodeDataURL);
      ctx.drawImage(qrImg, 415, 800, 250, 250);
    }
  }

  /**
   * Genera flyer completo y retorna data URL
   */
  static async generateFlyer(data: FlyerData): Promise<FlyerGenerationResult> {
    try {
      const canvas = document.createElement('canvas');
      await this.renderBasicTemplate(canvas, data);

      const dataURL = canvas.toDataURL('image/png', 0.92);
      
      // Calcular tamaño aproximado
      const base64Length = dataURL.split(',')[1].length;
      const sizeBytes = (base64Length * 3) / 4;

      return {
        success: true,
        dataURL,
        metadata: {
          width: 1080,
          height: 1080,
          size: sizeBytes
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

---

### **COMPONENTE: FlyerGenerator.tsx**

```typescript
// components/admin/flyer/FlyerGenerator.tsx

import React, { useState } from 'react';
import { useBusinessState } from '../../../context/BusinessContext';
import { FlyerGenerator as Generator } from '../../../utils/flyerGenerator';
import { FlyerData } from '../../../utils/flyerTypes';
import { Button } from '../../ui/Button';

export const FlyerGenerator: React.FC = () => {
  const business = useBusinessState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const handleGenerateFlyer = async () => {
    setIsGenerating(true);
    setError('');

    try {
      // 1. Generar QR code
      const shareLink = `${window.location.origin}/?token=${business.shareToken}`;
      const qrDataURL = await Generator.generateQRCode(shareLink);

      // 2. Preparar datos
      const flyerData: FlyerData = {
        businessName: business.name,
        logo: business.profileImageUrl,
        backgroundColor: business.branding.primaryColor,
        textColor: business.branding.textColor,
        qrCodeDataURL: qrDataURL,
        linkPlaceholder: '________________'
      };

      // 3. Generar flyer
      const result = await Generator.generateFlyer(flyerData);

      if (result.success && result.dataURL) {
        setFlyerPreview(result.dataURL);
        setShowModal(true);
      } else {
        setError(result.error || 'Error al generar flyer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!flyerPreview) return;

    const link = document.createElement('a');
    link.href = flyerPreview;
    link.download = `flyer-${business.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="mt-6 border border-default p-6 rounded-lg">
      <h4 className="text-lg font-semibold text-primary mb-3">
        Flyers Promocionales
      </h4>
      <p className="text-sm text-secondary mb-4">
        Genera flyers profesionales para compartir en Instagram y WhatsApp
      </p>

      <Button
        onClick={handleGenerateFlyer}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? 'Generando...' : '🎨 Generar Flyer'}
      </Button>

      {error && (
        <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Modal de preview */}
      {showModal && flyerPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-primary mb-4">
              Preview del Flyer
            </h3>
            
            <img
              src={flyerPreview}
              alt="Flyer preview"
              className="w-full rounded-lg border border-default mb-4"
            />

            <div className="flex gap-3">
              <Button
                onClick={handleDownload}
                className="flex-1"
              >
                📥 Descargar PNG
              </Button>
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 🧪 TESTING STRATEGY

### **UNIT TESTS**

```typescript
// utils/flyerGenerator.test.ts

describe('FlyerGenerator', () => {
  test('generateQRCode returns valid data URL', async () => {
    const url = 'https://example.com';
    const qr = await FlyerGenerator.generateQRCode(url);
    expect(qr).toMatch(/^data:image\/png;base64,/);
  });

  test('renderBasicTemplate creates valid canvas', async () => {
    const canvas = document.createElement('canvas');
    const data: FlyerData = {
      businessName: 'Test Business',
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      qrCodeDataURL: 'data:image/png;base64,test',
      linkPlaceholder: '___'
    };

    await FlyerGenerator.renderBasicTemplate(canvas, data);
    
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
  });
});
```

### **INTEGRATION TESTS**

```typescript
// components/admin/flyer/FlyerGenerator.test.tsx

describe('FlyerGenerator Component', () => {
  test('button disabled when no shareToken', () => {
    // Mock business without shareToken
    const { queryByText } = render(<SharePanel />);
    expect(queryByText('Generar Flyer')).not.toBeInTheDocument();
  });

  test('generates flyer when shareToken exists', async () => {
    // Mock business with active shareToken
    // Simulate click and verify download
  });
});
```

---

## 📊 ESTIMACIÓN DE EFFORT

### **BREAKDOWN POR TAREA**

| Tarea | Complejidad | Tiempo Estimado | AI Agent Recomendado |
|-------|-------------|-----------------|----------------------|
| Tipos TypeScript (`flyerTypes.ts`) | Baja | 10 min | ChatGPT 5 |
| Core utility (`flyerGenerator.ts`) | Media | 30 min | ChatGPT 5 |
| Componente `FlyerGenerator.tsx` | Media | 25 min | Zai GML 4.6 |
| Integración en `SharePanel.tsx` | Baja | 5 min | ChatGPT 5 |
| Testing unitario | Media | 20 min | ChatGPT 5 |
| Testing E2E | Media | 15 min | Playwright (ChatGPT) |
| Bug fixes + ajustes | Variable | 15 min | - |

**TOTAL ESTIMADO:** ⏱️ **2 horas** (con AI agents)

---

## ⚠️ RIESGOS Y CONSIDERACIONES

### **RIESGOS IDENTIFICADOS**

#### **R-1: Tamaño de archivo PNG**
- **Problema:** 1080x1080 PNG puede superar 1-2MB
- **Impacto:** Descarga lenta en mobile
- **Mitigación:** Compresión quality 0.92 + considerar WebP en futuro

#### **R-2: Logos con fondo transparente**
- **Problema:** Fondos oscuros + logo con transparencia puede verse mal
- **Impacto:** UX pobre en ciertos casos
- **Mitigación:** Forzar fondo blanco detrás del logo

#### **R-3: Textos muy largos**
- **Problema:** Nombres de negocio > 30 caracteres pueden no caber
- **Impacto:** Layout roto
- **Mitigación:** Text truncation + font size dinámico

#### **R-4: CORS en carga de imágenes**
- **Problema:** Logos desde Supabase pueden tener CORS issues
- **Impacto:** Canvas.toDataURL() puede fallar
- **Mitigación:** Configurar headers CORS en Supabase Storage

### **CONSIDERACIONES DE PERFORMANCE**

#### **Canvas Rendering:**
- **Tiempo esperado:** < 500ms para template básico
- **Bottleneck:** Carga de imágenes (logo + QR)
- **Optimización:** Cachear QR generado mientras modal está abierto

#### **Bundle Size Impact:**
```
Nuevos archivos: ~8KB (TypeScript comprimido)
QRCode library: YA EXISTE en proyecto (0KB adicional)
Total impact: ~8KB gzipped
```

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### **FASE 1: MVP (Esta iteración)**
- [x] Análisis y diseño arquitectónico
- [ ] Implementar tipos TypeScript
- [ ] Implementar `FlyerGenerator` utility
- [ ] Crear componente `FlyerGenerator`
- [ ] Integrar en `SharePanel`
- [ ] Testing básico
- [ ] Deploy y validación con usuario real

### **FASE 2: Mejoras (Próxima iteración)**
- [ ] Selector de color de fondo (override temporal)
- [ ] Template #2: Vertical stories (1080x1920)
- [ ] Preview en tiempo real
- [ ] Agregar servicios destacados en flyer
- [ ] Compartir directo a WhatsApp/Instagram (Web Share API)

### **FASE 3: Avanzado (Futuro)**
- [ ] Editor drag & drop de elementos
- [ ] Múltiples templates (5-10 opciones)
- [ ] Branding personalizado por flyer
- [ ] Guardado de flyers favoritos
- [ ] Analytics de descargas

---

## 📝 AGENT RECOMMENDATION

### **IMPLEMENTACIÓN SUGERIDA:**

```
🎯 TASK: Implementar Feature Flyers Marketing Automáticos

🤖 PRIMARY AGENT: ChatGPT 5
⏱️ ETA: 90-120 minutos
📊 SUCCESS RATE: Alta (85%)

💡 WHY ChatGPT 5:
- Canvas API ya dominado (ver ImageProcessor existente)
- Execution environment para testing inmediato
- Puede debuggear rendering issues en tiempo real
- Expertise en TypeScript + React

🔄 WORKFLOW RECOMENDADO:
1. ChatGPT: Implementar flyerGenerator.ts + types
2. ChatGPT: Test unitario de generator
3. Zai GML: Crear componente FlyerGenerator.tsx (UI)
4. ChatGPT: Integrar en SharePanel + E2E test
5. Manual: Testing visual en staging

⚠️ RISK MITIGATION:
- Testear con logos variados (con/sin transparencia)
- Validar en mobile devices (download funcional)
- Verificar CORS headers en Supabase Storage
```

---

## ✅ CHECKLIST PRE-IMPLEMENTACIÓN

### **ANTES DE EMPEZAR:**
- [ ] Confirmar que `qrcode` library funciona correctamente
- [ ] Verificar acceso a `business.profileImageUrl` (Supabase Storage)
- [ ] Validar CORS headers en Supabase Storage
- [ ] Crear branch `feature/flyers-marketing`
- [ ] Backup de `SharePanel.tsx` actual

### **DURANTE IMPLEMENTACIÓN:**
- [ ] Seguir naming conventions del proyecto
- [ ] Usar `Button` component existente
- [ ] Mantener consistencia con theme system (CSS variables)
- [ ] Agregar JSDoc comments en funciones públicas
- [ ] Testing en Chrome + Firefox mínimo

### **POST-IMPLEMENTACIÓN:**
- [ ] Actualizar este documento con cambios finales
- [ ] Crear screenshot del flyer generado para documentación
- [ ] Agregar entry en `ASTRA_Roadmap_Implementacion_Log`
- [ ] Notificar a Matías para testing manual

---

## 🎓 LECCIONES APRENDIDAS (Post-implementation)

**[PENDIENTE - Completar después de implementación]**

---

## 📎 REFERENCIAS

- [QRCode.js Documentation](https://github.com/soldair/node-qrcode)
- [Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [ImageProcessor existente](utils/imageProcessing.ts)
- [SharePanel actual](components/admin/SharePanel.tsx)

---

**Versión:** 1.0  
**Próxima revisión:** Post-implementación (actualizar con learnings reales)
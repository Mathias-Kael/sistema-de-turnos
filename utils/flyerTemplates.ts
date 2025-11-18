import { FlyerData } from './flyerTypes';
import { FlyerGenerator } from './flyerGenerator';

// --- Template 1: Moderno (El diseño mejorado que ya tenemos) ---
export const renderModernTemplate = async (ctx: CanvasRenderingContext2D, data: FlyerData): Promise<void> => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Fondo con Gradiente
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, data.backgroundColor);
    const lightColor = data.backgroundColor + 'BF'; // 75% alpha
    gradient.addColorStop(1, lightColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Header: Logo y Nombre
    const logoSize = 140;
    const logoX = (W - logoSize) / 2;
    const logoY = 80;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (data.logo) {
        try {
            const logoImg = await FlyerGenerator.loadImage(data.logo);
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            ctx.restore();
        } catch (e) { /* fallback handled below */ }
    }

    ctx.fillStyle = data.textColor;
    ctx.textAlign = 'center';
    FlyerGenerator.drawFittedText(ctx, data.businessName, W / 2, logoY + logoSize + 60, W - 160, 60);

    // Cuerpo: Mensaje Principal
    const mainMessageY = logoY + logoSize + 180;
    ctx.font = `bold 64px "Poppins", sans-serif`;
    ctx.fillText("¡Reservá tu turno online!", W / 2, mainMessageY);

    ctx.font = `42px "Poppins", sans-serif`;
    ctx.globalAlpha = 0.9;
    FlyerGenerator.drawMultilineText(ctx, [
        "Escaneá el QR o usá el link en la descripción.",
        "¡Disponible 24/7 para vos! 😎"
    ], W / 2, mainMessageY + 80, 52);
    ctx.globalAlpha = 1.0;

    // Footer: QR Code
    const qrContainerY = H - 320;
    const qrSize = 200;
    const qrX = (W - qrSize) / 2;
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.fillRect(qrX - 20, qrContainerY - 20, qrSize + 40, qrSize + 40);
    ctx.shadowColor = 'transparent';

    if (data.qrCodeDataURL) {
        const qrImg = await FlyerGenerator.loadImage(data.qrCodeDataURL);
        ctx.drawImage(qrImg, qrX, qrContainerY, qrSize, qrSize);
    }
    
    ctx.font = `bold 36px "Poppins", sans-serif`;
    ctx.fillStyle = data.textColor;
    ctx.fillText("Escaneá y reservá", W / 2, qrContainerY + qrSize + 60);
};


// --- Template 2: Elegante (Fondo oscuro, layout asimétrico) ---
export const renderElegantTemplate = async (ctx: CanvasRenderingContext2D, data: FlyerData): Promise<void> => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Fondo oscuro
    ctx.fillStyle = '#1A202C'; // Un color oscuro y elegante
    ctx.fillRect(0, 0, W, H);

    // Elemento decorativo
    ctx.fillStyle = data.backgroundColor;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(W - 400, H);
    ctx.quadraticCurveTo(W - 100, H / 2, W, 0);
    ctx.fill();

    // Logo (más grande y visible)
    const logoSize = 150;
    const logoX = 80;
    const logoY = 80;
    if (data.logo) {
        try {
            const logoImg = await FlyerGenerator.loadImage(data.logo);
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            ctx.restore();
        } catch(e) {}
    }

    // Textos
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.font = `bold 80px "Poppins", sans-serif`;
    ctx.fillText(data.businessName, logoX, logoY + logoSize + 100);
    
    ctx.font = `bold 52px "Poppins", sans-serif`;
    ctx.fillText("¡Reservá tu turno online!", logoX, logoY + logoSize + 180);

    ctx.font = `36px "Poppins", sans-serif`;
    ctx.globalAlpha = 0.85;
    FlyerGenerator.drawMultilineText(ctx, [
        "Escaneá el QR o usá el link",
        "en la descripción.",
        "¡Disponible 24/7 para vos! 😎"
    ], logoX, logoY + logoSize + 260, 46);
    ctx.globalAlpha = 1.0;

    // QR Code
    const qrSize = 220;
    const qrX = W - qrSize - 80;
    const qrY = H - qrSize - 80;
    ctx.fillStyle = 'white';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    if (data.qrCodeDataURL) {
        const qrImg = await FlyerGenerator.loadImage(data.qrCodeDataURL);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }
    ctx.font = `bold 28px "Poppins", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText("Escaneá para reservar", qrX + qrSize / 2, qrY + qrSize + 50);
};


// --- Template 3: Minimalista (Limpio, centrado, mucho espacio en blanco) ---
export const renderMinimalistTemplate = async (ctx: CanvasRenderingContext2D, data: FlyerData): Promise<void> => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Fondo blanco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, W, H);

    // Logo en el header (más visible)
    if (data.logo) {
        try {
            const logoImg = await FlyerGenerator.loadImage(data.logo);
            const logoSize = 160;
            const logoX = (W - logoSize) / 2;
            const logoY = 80;
            
            // Sombra sutil
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        } catch(e) {}
    }

    // Contenido centrado
    ctx.fillStyle = '#1A202C';
    ctx.textAlign = 'center';

    // Nombre del negocio (más prominente)
    ctx.font = `bold 80px "Poppins", sans-serif`;
    ctx.fillText(data.businessName, W / 2, 300);

    // QR Code
    const qrSize = 350;
    const qrX = (W - qrSize) / 2;
    const qrY = 380;
    if (data.qrCodeDataURL) {
        const qrImg = await FlyerGenerator.loadImage(data.qrCodeDataURL);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    // Mensaje promocional
    ctx.font = `bold 56px "Poppins", sans-serif`;
    ctx.fillText("¡Reservá tu turno online!", W / 2, qrY + qrSize + 100);
    
    ctx.font = `42px "Poppins", sans-serif`;
    ctx.globalAlpha = 0.85;
    FlyerGenerator.drawMultilineText(ctx, [
        "Escaneá el QR o usá el link en la descripción.",
        "¡Disponible 24/7 para vos! 😎"
    ], W / 2, qrY + qrSize + 170, 52);
    ctx.globalAlpha = 1.0;
};
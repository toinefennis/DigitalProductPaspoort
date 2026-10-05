import QRCode from 'qrcode';
import { promises as fs } from 'fs';
import path from 'path';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export async function generateQRCode(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    errorCorrectionLevel = 'H'
  } = options;

  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width,
      margin,
      errorCorrectionLevel,
      type: 'image/png',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export async function generateProductDPPUrl(gtin: string): Promise<string> {
  const baseUrl = (process.env.PUBLIC_DPP_BASE_URL || 'https://dpp.gwcirculair.nl').replace(/\/$/, '');
  
  return `${baseUrl}/dpp/${gtin}`;
}

export async function generateAndSaveQRCode(
  gtin: string,
  fileName?: string
): Promise<{ qrCodeData: string; dppUrl: string }> {
  const dppUrl = await generateProductDPPUrl(gtin);
  const qrCodeData = await generateQRCode(dppUrl);
  
  if (fileName) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const qrFilePath = path.join(uploadsDir, `qr-${fileName}.png`);
    const base64Data = qrCodeData.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(qrFilePath, base64Data, 'base64');
  }
  
  return { qrCodeData, dppUrl };
}

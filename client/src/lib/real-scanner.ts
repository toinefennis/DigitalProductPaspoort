import { BrowserMultiFormatReader } from '@zxing/browser';

export interface ScanResult {
  code: string;
  format: string;
  type: 'barcode' | 'qr';
}

export class RealScanner {
  private codeReader: BrowserMultiFormatReader;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private scanning = false;

  constructor() {
    this.codeReader = new BrowserMultiFormatReader();
  }

  async startScanning(
    videoElement: HTMLVideoElement,
    onScan: (result: ScanResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    this.videoElement = videoElement;

    try {
      // Get camera stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      videoElement.srcObject = this.stream;
      await videoElement.play();

      this.scanning = true;
      this.startContinuousDecoding(onScan, onError);

    } catch (error) {
      console.error('Error starting scanner:', error);
      onError('Kan camera niet openen. Controleer de toestemmingen.');
    }
  }

  private async startContinuousDecoding(
    onScan: (result: ScanResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    if (!this.videoElement || !this.scanning) return;

    try {
      const result = await this.codeReader.decodeOnceFromVideoDevice(undefined, this.videoElement);
      
      if (result) {
        const code = result.getText();
        const format = result.getBarcodeFormat().toString();
        
        // Detect if it's a GS1 QR code with URL format
        let finalCode = code;
        if (code.includes('id.gs1.org/01/')) {
          // Extract GTIN from GS1 URL: https://id.gs1.org/01/08721293800000
          const match = code.match(/\/01\/(\d+)/);
          if (match) {
            finalCode = match[1];
          }
        }

        const scanResult: ScanResult = {
          code: finalCode,
          format: format,
          type: this.isQRCode(format) ? 'qr' : 'barcode'
        };

        onScan(scanResult);
        return;
      }
    } catch (error) {
      // Ignore decode errors and continue scanning
      console.log('Scanning...');
    }

    // Continue scanning if still active
    if (this.scanning) {
      setTimeout(() => this.startContinuousDecoding(onScan, onError), 100);
    }
  }

  private isQRCode(format: string): boolean {
    return format.toLowerCase().includes('qr');
  }

  stopScanning(): void {
    this.scanning = false;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async toggleFlash(): Promise<boolean> {
    if (!this.stream) return false;

    try {
      const track = this.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (!('torch' in capabilities)) {
        throw new Error('Flash not supported');
      }

      const settings = track.getSettings();
      const newTorchState = !(settings as any).torch;

      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as any]
      });

      return newTorchState;
    } catch (error) {
      console.error('Error toggling flash:', error);
      return false;
    }
  }
}
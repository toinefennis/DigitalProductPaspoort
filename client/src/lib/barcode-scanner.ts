import Quagga from 'quagga';
import { BrowserMultiFormatReader } from '@zxing/library';

export interface ScanResult {
  code: string;
  format: string;
  type: 'barcode' | 'qr';
}

export class BarcodeScanner {
  private quaggaInitialized = false;
  private zxingReader = new BrowserMultiFormatReader();
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

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

      // Start Quagga for barcode scanning
      await this.initQuagga(videoElement, onScan, onError);

      // Start ZXing for QR codes
      this.startZXingScanning(onScan, onError);

    } catch (error) {
      console.error('Error starting scanner:', error);
      onError('Kan camera niet openen. Controleer de toestemmingen.');
    }
  }

  private async initQuagga(
    videoElement: HTMLVideoElement,
    onScan: (result: ScanResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoElement,
          constraints: {
            width: 1280,
            height: 720,
            facingMode: "environment"
          }
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader"
          ]
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10
      }, (err) => {
        if (err) {
          console.error('Quagga init error:', err);
          reject(err);
          return;
        }

        this.quaggaInitialized = true;
        Quagga.start();

        Quagga.onDetected((result) => {
          const code = result.codeResult.code;
          if (this.isValidGTIN(code)) {
            onScan({
              code,
              format: result.codeResult.format,
              type: 'barcode'
            });
          }
        });

        resolve();
      });
    });
  }

  private startZXingScanning(
    onScan: (result: ScanResult) => void,
    onError: (error: string) => void
  ): void {
    if (!this.videoElement) return;

    const scanInterval = setInterval(() => {
      if (!this.videoElement || this.videoElement.readyState !== this.videoElement.HAVE_ENOUGH_DATA) {
        return;
      }

      try {
        this.zxingReader.decodeOnceFromVideoDevice(undefined, this.videoElement.id)
          .then(result => {
            const code = result.getText();
            if (this.isValidGTIN(code) || this.isQRCode(result.getBarcodeFormat().toString())) {
              clearInterval(scanInterval);
              onScan({
                code,
                format: result.getBarcodeFormat().toString(),
                type: this.isQRCode(result.getBarcodeFormat().toString()) ? 'qr' : 'barcode'
              });
            }
          })
          .catch(() => {
            // Continue scanning - no result found
          });
      } catch (error) {
        // Continue scanning
      }
    }, 500);

    // Store interval for cleanup
    (this.videoElement as any).scanInterval = scanInterval;
  }

  private isValidGTIN(code: string): boolean {
    // GTIN validation - check if it's 8, 12, 13, or 14 digits
    const cleanCode = code.replace(/\D/g, '');
    return /^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(cleanCode) && this.validateGTINChecksum(cleanCode);
  }

  private validateGTINChecksum(gtin: string): boolean {
    // GTIN checksum validation
    if (gtin.length < 8) return false;
    
    const digits = gtin.split('').map(Number);
    const checkDigit = digits.pop()!;
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const multiplier = (digits.length - i) % 2 === 0 ? 1 : 3;
      sum += digits[i] * multiplier;
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }

  private isQRCode(format: string): boolean {
    return format.toLowerCase().includes('qr');
  }

  stopScanning(): void {
    if (this.quaggaInitialized) {
      Quagga.stop();
      this.quaggaInitialized = false;
    }

    if (this.videoElement && (this.videoElement as any).scanInterval) {
      clearInterval((this.videoElement as any).scanInterval);
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.zxingReader.reset();
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
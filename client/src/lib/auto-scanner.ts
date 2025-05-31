import Quagga from 'quagga';

export interface ScanResult {
  code: string;
  format: string;
  type: 'barcode' | 'qr';
}

export class AutoScanner {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private scanning = false;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d')!;
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

      // Initialize Quagga for barcode scanning
      await this.initQuagga(videoElement, onScan, onError);
      
      // Also start QR code detection
      this.startQRDetection(onScan);

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
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader", 
            "code_128_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ]
        },
        locate: true
      }, (err: any) => {
        if (err) {
          console.error('Quagga init error:', err);
          reject(err);
          return;
        }

        Quagga.start();
        this.scanning = true;

        Quagga.onDetected((result: any) => {
          if (!this.scanning) return;

          const code = result.codeResult.code;
          const format = result.codeResult.format;

          // Validate GTIN
          if (this.isValidGTIN(code)) {
            onScan({
              code: code,
              format: format,
              type: 'barcode'
            });
          }
        });

        resolve();
      });
    });
  }

  private startQRDetection(onScan: (result: ScanResult) => void): void {
    if (!this.videoElement) return;

    const detectQR = () => {
      if (!this.scanning || !this.videoElement) return;

      try {
        // Set canvas size to match video
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;

        // Draw current video frame to canvas
        this.context.drawImage(this.videoElement, 0, 0);

        // Try to detect QR code patterns (simplified detection)
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Look for QR code finder patterns in the image data
        // This is a simplified approach - in production you'd use a proper QR library
        // For now, we'll focus on the barcode detection with Quagga
        
      } catch (error) {
        console.log('QR detection error:', error);
      }

      // Continue detection
      if (this.scanning) {
        requestAnimationFrame(detectQR);
      }
    };

    // Start QR detection loop
    requestAnimationFrame(detectQR);
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

  stopScanning(): void {
    this.scanning = false;

    try {
      if (Quagga) {
        Quagga.stop();
      }
    } catch (error) {
      console.log('Error stopping Quagga:', error);
    }

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
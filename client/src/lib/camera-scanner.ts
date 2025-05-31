export interface ScanResult {
  code: string;
  format: string;
  type: 'barcode' | 'qr';
}

export class CameraScanner {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private scanning = false;

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

      this.scanning = true;
      
      // For demo purposes, show manual input after 2 seconds
      setTimeout(() => {
        if (this.scanning) {
          this.promptForManualInput(onScan);
        }
      }, 2000);

    } catch (error) {
      console.error('Error starting scanner:', error);
      onError('Kan camera niet openen. Controleer de toestemmingen.');
    }
  }

  private promptForManualInput(onScan: (result: ScanResult) => void): void {
    const userInput = prompt(
      "Voer de GTIN/barcode code in die je wilt scannen:\n\n" +
      "Voorbeelden van jouw afbeeldingen:\n" +
      "• 8721293800031 (EAN-13 barcode)\n" +
      "• 8721293800024 (uit QR-code)\n\n" +
      "Of voer een andere GTIN in:"
    );
    
    if (userInput) {
      let code = userInput.trim();
      let type: 'barcode' | 'qr' = 'barcode';
      
      // Check if it's a GS1 URL format
      if (code.includes('id.gs1.org/01/')) {
        // Extract GTIN from GS1 URL: https://id.gs1.org/01/08721293800000
        const match = code.match(/\/01\/(\d+)/);
        if (match) {
          code = match[1];
          type = 'qr';
        }
      }

      const result: ScanResult = {
        code: code,
        format: this.getGTINFormat(code),
        type: type
      };

      onScan(result);
    }
  }

  private getGTINFormat(gtin: string): string {
    const length = gtin.length;
    switch (length) {
      case 8: return 'EAN-8';
      case 12: return 'UPC-A';
      case 13: return 'EAN-13';
      case 14: return 'ITF-14';
      default: return 'Unknown';
    }
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
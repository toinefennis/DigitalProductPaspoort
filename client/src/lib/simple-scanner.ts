export interface ScanResult {
  code: string;
  format: string;
  type: 'barcode' | 'qr';
}

export class SimpleScanner {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private scanInterval: number | null = null;

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

      // Start mock scanning for demo (replace with real barcode library)
      this.startMockScanning(onScan);

    } catch (error) {
      console.error('Error starting scanner:', error);
      onError('Kan camera niet openen. Controleer de toestemmingen.');
    }
  }

  private startMockScanning(onScan: (result: ScanResult) => void): void {
    let scanCount = 0;
    this.scanInterval = window.setInterval(() => {
      scanCount++;
      
      // Simulate finding different types of codes
      if (scanCount === 10) { // After 5 seconds
        const mockGTINs = [
          '8712345678901',
          '0123456789012', 
          '8720796166279',
          '9506000134352'
        ];
        const randomGTIN = mockGTINs[Math.floor(Math.random() * mockGTINs.length)];
        
        onScan({
          code: randomGTIN,
          format: 'EAN-13',
          type: 'barcode'
        });
        
        if (this.scanInterval) {
          clearInterval(this.scanInterval);
          this.scanInterval = null;
        }
      }
    }, 500);
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
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
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
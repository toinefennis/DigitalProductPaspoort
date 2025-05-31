export interface CameraCapabilities {
  torch?: boolean;
  zoom?: boolean;
  facingMode?: string[];
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;

  async startCamera(constraints: MediaStreamConstraints = {}): Promise<MediaStream> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        ...constraints,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
      this.videoTrack = this.stream.getVideoTracks()[0];
      
      return this.stream;
    } catch (error) {
      console.error("Error starting camera:", error);
      throw new Error("Failed to access camera. Please check permissions.");
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.videoTrack = null;
    }
  }

  async toggleTorch(): Promise<boolean> {
    if (!this.videoTrack) {
      throw new Error("No active video track");
    }

    try {
      const capabilities = this.videoTrack.getCapabilities();
      if (!('torch' in capabilities)) {
        throw new Error("Torch not supported on this device");
      }

      const settings = this.videoTrack.getSettings();
      const newTorchState = !(settings as any).torch;

      await this.videoTrack.applyConstraints({
        advanced: [{ torch: newTorchState } as any]
      });

      return newTorchState;
    } catch (error) {
      console.error("Error toggling torch:", error);
      throw new Error("Failed to toggle torch");
    }
  }

  getCapabilities(): CameraCapabilities {
    if (!this.videoTrack) {
      return {};
    }

    return this.videoTrack.getCapabilities();
  }

  async switchCamera(): Promise<MediaStream> {
    const currentConstraints = this.videoTrack?.getConstraints();
    const currentFacingMode = (currentConstraints as any)?.facingMode;
    
    this.stopCamera();

    const newFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    
    return this.startCamera({
      video: {
        facingMode: newFacingMode,
        width: { ideal: 640 },
        height: { ideal: 480 },
      }
    });
  }

  captureFrame(video: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }
}

export const cameraManager = new CameraManager();

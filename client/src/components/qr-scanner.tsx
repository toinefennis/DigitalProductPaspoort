import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Flashlight, RotateCcw, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onManualEntry: () => void;
}

export function QRScanner({ onScan, onManualEntry }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        
        // Check if flash is available
        const track = mediaStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        setHasFlash('torch' in capabilities);
        
        setIsScanning(true);
        startScanning();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;
    
    try {
      const track = stream.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any]
      });
      setFlashOn(!flashOn);
    } catch (error) {
      console.error("Error toggling flash:", error);
    }
  };

  const switchCamera = async () => {
    stopCamera();
    // In a real implementation, you would cycle through available cameras
    setTimeout(startCamera, 100);
  };

  const startScanning = () => {
    // This is a simplified QR scanning implementation
    // In a real app, you would use a library like ZXing or QuaggaJS
    const scanInterval = setInterval(() => {
      if (!isScanning || !videoRef.current || !canvasRef.current) {
        clearInterval(scanInterval);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // Simulate QR code detection for demo
        // In practice, you would use a QR code detection library here
        if (Math.random() < 0.1) { // 10% chance per scan
          const mockGTIN = "8720796166279";
          clearInterval(scanInterval);
          onScan(mockGTIN);
        }
      }
    }, 500);
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Scanning frame */}
          <div className="w-64 h-64 border-2 border-white rounded-lg relative">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-gwc-primary rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-gwc-primary rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-gwc-primary rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-gwc-primary rounded-br-lg"></div>
            
            {/* Scanning line animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gwc-primary opacity-75 animate-pulse"></div>
          </div>
          
          {/* Instructions */}
          <p className="text-white text-center mt-6 text-lg font-medium">Scan QR-code</p>
          <p className="text-gray-300 text-center mt-2 text-sm">Houd de QR-code binnen het kader</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-8">
        {hasFlash && (
          <Button
            variant="ghost"
            size="lg"
            className="bg-white bg-opacity-20 p-4 rounded-full text-white hover:bg-white hover:bg-opacity-30"
            onClick={toggleFlash}
          >
            <Flashlight className={`h-6 w-6 ${flashOn ? 'fill-current' : ''}`} />
          </Button>
        )}
        
        <Button
          size="lg"
          className="bg-gwc-primary hover:bg-gwc-primary/90 p-6 rounded-full shadow-material-3"
          onClick={onManualEntry}
        >
          <Keyboard className="h-8 w-8 text-white" />
        </Button>
        
        <Button
          variant="ghost"
          size="lg"
          className="bg-white bg-opacity-20 p-4 rounded-full text-white hover:bg-white hover:bg-opacity-30"
          onClick={switchCamera}
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

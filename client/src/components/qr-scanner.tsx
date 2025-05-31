import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Flashlight, RotateCcw, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AutoScanner, type ScanResult } from "@/lib/auto-scanner";

interface QRScannerProps {
  onScan: (data: string, type: 'barcode' | 'qr') => void;
  onManualEntry: () => void;
}

export function QRScanner({ onScan, onManualEntry }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<AutoScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new AutoScanner();
      
      await scannerRef.current.startScanning(
        videoRef.current,
        (result: ScanResult) => {
          setIsScanning(false);
          toast({
            title: "Code gescand",
            description: `${result.type === 'qr' ? 'QR-code' : 'Barcode'} gevonden: ${result.code}`,
          });
          onScan(result.code, result.type);
        },
        (error: string) => {
          toast({
            title: "Scan Error",
            description: error,
            variant: "destructive",
          });
        }
      );

      setIsScanning(true);
      
      // Check if flash is available
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          setHasFlash('torch' in capabilities);
        }
      } catch (error) {
        console.error("Error checking flash capabilities:", error);
      }

    } catch (error) {
      console.error("Error starting scanner:", error);
      toast({
        title: "Scanner Error",
        description: "Kan camera niet openen. Controleer de toestemmingen.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleFlash = async () => {
    if (!scannerRef.current || !hasFlash) return;
    
    try {
      const newFlashState = await scannerRef.current.toggleFlash();
      setFlashOn(newFlashState);
    } catch (error) {
      console.error("Error toggling flash:", error);
      toast({
        title: "Flash Error",
        description: "Kan zaklamp niet schakelen.",
        variant: "destructive",
      });
    }
  };

  const restartScanning = () => {
    stopScanning();
    setTimeout(startScanning, 100);
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />

      
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
          onClick={restartScanning}
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

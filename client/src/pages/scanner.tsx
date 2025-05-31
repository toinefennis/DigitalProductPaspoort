import { useState } from "react";
import { useLocation } from "wouter";
import { QRScanner } from "@/components/qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Scanner() {
  const [, setLocation] = useLocation();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualGtin, setManualGtin] = useState("");
  const { toast } = useToast();

  const handleScan = async (gtin: string, type: 'barcode' | 'qr') => {
    console.log('handleScan called with GTIN:', gtin, 'type:', type);
    
    try {
      // First check if product exists
      const response = await fetch(`/api/products/gtin/${gtin}`);
      
      if (response.ok) {
        // Product exists, go to product detail
        console.log('Product exists, navigating to detail page');
        setLocation(`/product/gtin/${gtin}`);
      } else if (response.status === 404) {
        // Product doesn't exist, redirect to add product with GTIN pre-filled
        console.log('Product not found, navigating to add-product with GTIN:', gtin);
        setLocation(`/add-product?gtin=${encodeURIComponent(gtin)}&scanType=${type}`);
      } else {
        throw new Error('Failed to check product');
      }
    } catch (error) {
      console.error('Error in handleScan:', error);
      toast({
        title: "Fout bij zoeken",
        description: "Kon product niet ophalen. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
  };

  const handleManualSubmit = () => {
    if (manualGtin.trim()) {
      setShowManualEntry(false);
      handleScan(manualGtin.trim(), 'barcode');
      setManualGtin("");
    } else {
      toast({
        title: "Invalid GTIN",
        description: "Please enter a valid GTIN code.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="h-full bg-black relative">
        <QRScanner onScan={handleScan} onManualEntry={handleManualEntry} />
      </div>

      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter GTIN Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-gtin">GTIN Code</Label>
              <Input
                id="manual-gtin"
                type="text"
                placeholder="8720796166279"
                value={manualGtin}
                onChange={(e) => setManualGtin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowManualEntry(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gwc-primary hover:bg-gwc-primary/90"
                onClick={handleManualSubmit}
              >
                Search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

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

  const handleScan = (gtin: string) => {
    // Navigate to product detail by GTIN
    setLocation(`/product/gtin/${gtin}`);
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
  };

  const handleManualSubmit = () => {
    if (manualGtin.trim()) {
      setShowManualEntry(false);
      handleScan(manualGtin.trim());
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

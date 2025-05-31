import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, QrCode, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function FloatingActionButton() {
  const [showMenu, setShowMenu] = useState(false);
  const [, setLocation] = useLocation();

  const handleQuickAction = (action: string) => {
    setShowMenu(false);
    if (action === "add-product") {
      setLocation("/add-product");
    } else if (action === "scan") {
      setLocation("/scanner");
    }
  };

  return (
    <>
      {/* Quick Action Menu */}
      {showMenu && (
        <Card className="fixed bottom-20 right-4 bg-white shadow-material-3 z-20 p-2">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start space-x-3 h-auto py-3"
              onClick={() => handleQuickAction("add-product")}
            >
              <Plus className="h-4 w-4 text-gwc-primary" />
              <span className="text-sm font-medium">Nieuw Product</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start space-x-3 h-auto py-3"
              onClick={() => handleQuickAction("scan")}
            >
              <QrCode className="h-4 w-4 text-gwc-secondary" />
              <span className="text-sm font-medium">Scan Product</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 bg-gwc-primary hover:bg-gwc-primary/90 text-white p-4 rounded-full shadow-material-3 z-10"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

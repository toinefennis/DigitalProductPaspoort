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
      {/* Overlay to close menu when clicking outside */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10 bg-black bg-opacity-25"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Quick Action Menu */}
      {showMenu && (
        <Card className="fixed bottom-[calc(8rem+env(safe-area-inset-bottom))] right-4 z-20 bg-white p-2 shadow-material-3 sm:right-6 lg:bottom-24 lg:right-8">
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
        aria-label={showMenu ? "Snelle acties sluiten" : "Snelle acties openen"}
        aria-expanded={showMenu}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 rounded-full bg-gwc-primary p-4 text-white shadow-material-3 hover:bg-gwc-primary/90 sm:right-6 lg:bottom-8 lg:right-8"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

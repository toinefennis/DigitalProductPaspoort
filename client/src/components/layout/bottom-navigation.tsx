import { useLocation } from "wouter";
import { Home, QrCode, Package, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: QrCode, label: "Scannen", path: "/scanner" },
  { icon: Package, label: "Producten", path: "/products" },
  { icon: BookOpen, label: "Verhalen", path: "/stories" },
  { icon: Settings, label: "Instellingen", path: "/settings" },
];

export function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 max-w-md mx-auto">
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || 
            (item.path === "/" && location === "/") ||
            (item.path === "/scanner" && location === "/scanner");

          return (
            <Button
              key={item.path}
              variant="ghost"
              className={`flex-1 flex flex-col items-center py-2 px-1 h-auto ${
                isActive ? "text-gwc-primary" : "text-gray-600"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

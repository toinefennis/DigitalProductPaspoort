import { useLocation } from "wouter";
import { Home, QrCode, Package, BookOpen, Settings, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const navItems = isAuthenticated
    ? [
        { icon: Home, label: "Dashboard", path: "/" },
        { icon: QrCode, label: "Scannen", path: "/scanner" },
        { icon: Package, label: "Producten", path: "/products" },
        { icon: BookOpen, label: "Verhalen", path: "/stories" },
        { icon: Settings, label: "Instellingen", path: "/settings" },
      ]
    : [
        { icon: Package, label: "Producten", path: "/producten" },
        { icon: LogIn, label: "Inloggen", path: "/login" },
      ];

  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 max-w-md mx-auto">
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

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

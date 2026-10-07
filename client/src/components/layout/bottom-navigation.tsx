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
      <nav aria-label="Mobiele navigatie" className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-screen-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Button
              key={item.path}
              variant="ghost"
              aria-current={isActive ? "page" : undefined}
              className={`min-h-14 flex-1 flex flex-col items-center justify-center gap-1 px-1 py-2 ${
                isActive ? "text-gwc-primary" : "text-gray-600"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="text-[11px] leading-tight sm:text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

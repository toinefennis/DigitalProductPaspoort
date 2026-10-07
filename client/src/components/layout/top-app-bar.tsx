import { Bell, ClipboardList, Home, Package, QrCode, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/hooks/useAuth";

export function TopAppBar() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: QrCode, label: "Scannen", path: "/scanner" },
    { icon: Package, label: "Producten", path: "/products" },
    { icon: BookOpen, label: "Verhalen", path: "/stories" },
    { icon: Settings, label: "Instellingen", path: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-gwc-primary text-white shadow-material-2">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-2 px-3 py-2 sm:px-5 lg:min-h-[72px] lg:gap-5 lg:px-8">
        <button
          type="button"
          onClick={() => setLocation(isAuthenticated ? "/" : "/producten")}
          aria-label="GWC DPP startpagina"
          className="flex min-w-0 shrink-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:gap-3"
        >
          <img
            src="/assets/brand/project-logo.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
          />
          <span className="truncate text-base font-semibold sm:text-lg">GWC DPP</span>
        </button>

        {isAuthenticated && (
          <nav aria-label="Hoofdnavigatie" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {navItems.map(({ icon: Icon, label, path }) => {
              const active = path === "/"
                ? location === "/"
                : location === path || location.startsWith(`${path}/`);
              return (
                <Button
                  key={path}
                  type="button"
                  variant="ghost"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setLocation(path)}
                  className={`h-10 gap-2 whitespace-nowrap px-3 text-sm text-white hover:bg-white/15 hover:text-white ${
                    active ? "bg-white/15 font-semibold" : "font-medium"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </Button>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => setLocation("/loans")}
                title="Uitleenoverzicht"
                aria-label="Uitleenoverzicht"
              >
                <ClipboardList className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => setLocation("/notifications")}
                title="Meldingen"
                aria-label="Meldingen"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

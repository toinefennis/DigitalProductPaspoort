import { Bell, User, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { UserNav } from "@/components/user-nav";

export function TopAppBar() {
  const [, setLocation] = useLocation();

  return (
    <header className="bg-gwc-primary text-white shadow-material-2 relative z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <img
            src="/assets/brand/project-logo.png"
            alt=""
            aria-hidden="true"
            className="w-7 h-7 object-contain"
          />
          <h1 className="text-lg font-medium">GWC DPP</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white hover:bg-opacity-10"
            onClick={() => setLocation("/loans")}
            title="Uitleenoverzicht"
          >
            <ClipboardList className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white hover:bg-opacity-10"
            onClick={() => setLocation("/notifications")}
          >
            <Bell className="h-5 w-5" />
          </Button>
          <UserNav />
        </div>
      </div>
    </header>
  );
}

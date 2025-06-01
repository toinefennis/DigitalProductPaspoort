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
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.17,22L6.58,19.58C8.84,20.81 11.6,21.5 14.5,21.5C15.9,21.5 17.24,21.35 18.53,21.07L20.74,22.5L21.74,21.07C20.37,16.66 17.58,10.38 17,8M12.5,10C13.61,10 14.5,10.9 14.5,12S13.61,14 12.5,14 10.5,13.1 10.5,12 11.39,10 12.5,10M12,7.5A4.5,4.5 0 0,1 16.5,12A4.5,4.5 0 0,1 12,16.5A4.5,4.5 0 0,1 7.5,12A4.5,4.5 0 0,1 12,7.5M5.6,16.25C7.26,12.96 9.97,8.5 12,8.5C14.03,8.5 16.74,12.96 18.4,16.25C16.74,19.54 14.03,24 12,24C9.97,24 7.26,19.54 5.6,16.25Z" />
          </svg>
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

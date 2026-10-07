import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, LogIn, Database } from "lucide-react";
import { useLocation } from "wouter";

export function UserNav() {
  const [, setLocation] = useLocation();

  const { user, isLoading } = useAuth();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'user': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Superadmin';
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'user': return 'Gebruiker';
      default: return 'Gast';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setLocation("/login")}
        aria-label="Inloggen"
        className="flex h-10 items-center gap-2 px-2 text-white hover:bg-white/10 hover:text-white sm:px-3"
      >
        <LogIn aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Inloggen</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label="Gebruikersmenu" className="relative h-10 w-10 rounded-full text-white hover:bg-white/10 hover:text-white">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gwc-primary text-white">
              {user.fullName ? getInitials(user.fullName) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.fullName || 'Gebruiker'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="pt-1">
              <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profiel</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Instellingen</span>
        </DropdownMenuItem>
        {(user.role === 'manager' || user.role === 'admin' || user.role === 'superadmin') && (
          <DropdownMenuItem onClick={() => setLocation("/gtin-registry")}>
            <Database className="mr-2 h-4 w-4" />
            <span>GTIN Register</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = "/api/logout"}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Uitloggen</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { LogIn, User, Lock, QrCode, UserPlus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import QRCode from "qrcode";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Generate QR code for registration
  useEffect(() => {
    const generateQR = async () => {
      try {
        const registrationUrl = `${window.location.origin}/register`;
        const qrDataUrl = await QRCode.toDataURL(registrationUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#1a5f3b',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };
    generateQR();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inloggen succesvol",
        description: "Je bent succesvol ingelogd",
      });
      // Force page reload to update authentication state
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Inloggen mislukt",
        description: error.message || "Onjuist e-mailadres, gebruikersnaam of wachtwoord",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      loginMutation.mutate({ username: username.trim(), password });
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-gwc-primary rounded-full flex items-center justify-center">
              <LogIn className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>Inloggen bij GWC DPP</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">E-mailadres of gebruikersnaam</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="E-mailadres of gebruikersnaam"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="Voer je wachtwoord in"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setLocation("/forgot-password")}
                  className="h-auto px-0 py-1 text-sm text-gwc-primary"
                >
                  Wachtwoord vergeten?
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending || !username || !password}
            >
              {loginMutation.isPending ? "Bezig met inloggen..." : "Inloggen"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/register")}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nieuw Account Aanmaken
              </Button>
            </div>

            {qrCodeUrl && (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-gwc-primary" />
                  <h4 className="font-medium text-sm">Scan voor registratie</h4>
                </div>
                <img 
                  src={qrCodeUrl} 
                  alt="Registratie QR Code" 
                  className="mx-auto rounded border-2 border-gwc-primary/20"
                  data-testid="qr-registration"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Scan deze code om direct te registreren
                </p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">of</span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setLocation("/producten")}
              className="w-full text-gray-500 hover:text-gwc-primary"
            >
              <Package className="h-4 w-4 mr-2" />
              Bekijk catalogus zonder inloggen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
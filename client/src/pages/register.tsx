import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, User, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registratie mislukt");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registratie succesvol",
        description: "Je account is aangemaakt. Je kunt nu inloggen.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registratie mislukt",
        description: error.message || "Er is een fout opgetreden bij registratie",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Wachtwoorden komen niet overeen",
        description: "Controleer of beide wachtwoorden hetzelfde zijn",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Wachtwoord te kort",
        description: "Wachtwoord moet minimaal 6 tekens lang zijn",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="h-full flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md my-8">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-gwc-primary rounded-full flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>Nieuwe Account Aanmaken</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Vul onderstaande gegevens in om een account aan te maken
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Voornaam</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Voornaam"
                  value={formData.firstName}
                  onChange={handleChange}
                  data-testid="input-firstname"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Achternaam</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Achternaam"
                  value={formData.lastName}
                  onChange={handleChange}
                  data-testid="input-lastname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="naam@voorbeeld.nl"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Gebruikersnaam *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Kies een gebruikersnaam"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  data-testid="input-username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimaal 6 tekens"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig Wachtwoord *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Herhaal je wachtwoord"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Bezig met registreren..." : "Account Aanmaken"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setLocation("/")}
                className="text-sm"
              >
                Heb je al een account? Inloggen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

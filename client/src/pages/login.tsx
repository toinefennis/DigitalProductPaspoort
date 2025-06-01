import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Ongeldig email adres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 karakters zijn"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 karakters zijn"),
  email: z.string().email("Ongeldig email adres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 karakters zijn"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      toast({
        title: "Inloggen succesvol",
        description: "Welkom terug!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Inloggen mislukt",
        description: error.message || "Ongeldige inloggegevens",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      return await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Registratie succesvol",
        description: "Je account is aangemaakt. Je kunt nu inloggen.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registratie mislukt",
        description: error.message || "Er is een fout opgetreden bij registratie",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-12 h-12 text-gwc-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.17,22L6.58,19.58C8.84,20.81 11.6,21.5 14.5,21.5C15.9,21.5 17.24,21.35 18.53,21.07L20.74,22.5L21.74,21.07C20.37,16.66 17.58,10.38 17,8M12.5,10C13.61,10 14.5,10.9 14.5,12S13.61,14 12.5,14 10.5,13.1 10.5,12 11.39,10 12.5,10M12,7.5A4.5,4.5 0 0,1 16.5,12A4.5,4.5 0 0,1 12,16.5A4.5,4.5 0 0,1 7.5,12A4.5,4.5 0 0,1 12,7.5M5.6,16.25C7.26,12.96 9.97,8.5 12,8.5C14.03,8.5 16.74,12.96 18.4,16.25C16.74,19.54 14.03,24 12,24C9.97,24 7.26,19.54 5.6,16.25Z" />
            </svg>
          </div>
          <CardTitle className="text-2xl">GWC Digital Product Passport</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Inloggen</TabsTrigger>
              <TabsTrigger value="register">Registreren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...loginForm.register("email")}
                    className={loginForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="password">Wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...loginForm.register("password")}
                      className={loginForm.formState.errors.password ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500 mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {loginMutation.isPending ? "Bezig met inloggen..." : "Inloggen"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Naam</Label>
                  <Input
                    id="name"
                    {...registerForm.register("name")}
                    className={registerForm.formState.errors.name ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    {...registerForm.register("email")}
                    className={registerForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="register-password">Wachtwoord</Label>
                  <Input
                    id="register-password"
                    type="password"
                    {...registerForm.register("password")}
                    className={registerForm.formState.errors.password ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500 mt-1">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="confirm-password">Bevestig wachtwoord</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    {...registerForm.register("confirmPassword")}
                    className={registerForm.formState.errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {registerMutation.isPending ? "Bezig met registreren..." : "Account aanmaken"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-sm"
            >
              Doorgaan als gast (alleen bekijken)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
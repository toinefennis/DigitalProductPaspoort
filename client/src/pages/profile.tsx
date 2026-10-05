import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Mail, Phone, Calendar, Shield, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
  newPassword: z.string().min(6, "Nieuw wachtwoord moet minimaal 6 karakters zijn"),
  confirmPassword: z.string().min(1, "Bevestig het nieuwe wachtwoord"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  fullName: z.string().min(1, "Volledige naam is verplicht"),
  email: z.string().email("Ongeldig email adres"),
  phone: z.string().optional(),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const { toast } = useToast();

  const { user, isLoading } = useAuth();

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: (user as any)?.fullName || "",
      email: (user as any)?.email || "",
      phone: (user as any)?.phone || "",
    },
  });

  // Update form when user data loads
  if (user && !profileForm.formState.isDirty) {
    profileForm.reset({
      fullName: (user as any).fullName || "",
      email: (user as any).email || "",
      phone: (user as any).phone || "",
    });
  }

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wachtwoord gewijzigd",
        description: "Je wachtwoord is succesvol gewijzigd",
      });
      passwordForm.reset();
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Wachtwoord wijziging mislukt",
        description: error.message || "Er is een fout opgetreden",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch("/api/users/update-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profiel bijgewerkt",
        description: "Je profielgegevens zijn succesvol bijgewerkt",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Profiel update mislukt",
        description: error.message || "Er is een fout opgetreden",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

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
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'user': return 'Gebruiker';
      default: return 'Gast';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-gwc-primary rounded-full mx-auto mb-4"></div>
          <p>Profiel laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">Niet ingelogd</h2>
          <p className="text-gray-600 mb-4">Je bent niet ingelogd. Log in om je profiel te bekijken.</p>
          <Button onClick={() => window.location.href = "/api/login"}>
            Inloggen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-6 w-6 text-gwc-primary" />
          <h1 className="text-xl font-medium">Mijn Profiel</h1>
          <Badge variant={getRoleBadgeVariant(user.role)}>
            {getRoleLabel(user.role)}
          </Badge>
        </div>

        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profielinformatie</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volledige naam</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Je volledige naam" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email adres</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="je@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefoonnummer (optioneel)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="06-12345678" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending || !profileForm.formState.isDirty}
                >
                  {updateProfileMutation.isPending ? "Bijwerken..." : "Profiel bijwerken"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Account Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Email adres</span>
              </div>
              <span className="text-sm text-gray-600">{(user as any).email}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Rol</span>
              </div>
              <Badge variant={getRoleBadgeVariant((user as any).role)}>
                {getRoleLabel((user as any).role)}
              </Badge>
            </div>

            {(user as any).phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Telefoon</span>
                </div>
                <span className="text-sm text-gray-600">{(user as any).phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Lid sinds</span>
              </div>
              <span className="text-sm text-gray-600">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('nl-NL') : "Niet beschikbaar"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Wachtwoord wijzigen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button 
                variant="outline" 
                onClick={() => setShowPasswordForm(true)}
                className="w-full"
              >
                <Lock className="h-4 w-4 mr-2" />
                Wachtwoord wijzigen
              </Button>
            ) : (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Huidig wachtwoord</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Je huidige wachtwoord" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nieuw wachtwoord</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Je nieuwe wachtwoord" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bevestig nieuw wachtwoord</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Bevestig je nieuwe wachtwoord" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                      className="flex-1"
                    >
                      {updatePasswordMutation.isPending ? "Wijzigen..." : "Wachtwoord wijzigen"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowPasswordForm(false);
                        passwordForm.reset();
                      }}
                      className="flex-1"
                    >
                      Annuleren
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              onClick={() => window.location.href = "/api/logout"}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Uitloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
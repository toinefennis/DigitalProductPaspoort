import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Crown, User, Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";

const userSchema = z.object({
  email: z.string().email("Ongeldig emailadres"),
  username: z.string().min(3, "Gebruikersnaam moet minimaal 3 karakters lang zijn"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 karakters lang zijn"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "manager", "user"]).default("user"),
});

type UserFormData = z.infer<typeof userSchema>;

export default function Users() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Check if user has permission to view user management
  const hasUserManagementAccess = (currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'manager';

  if (!hasUserManagementAccess) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">Geen toegang</h2>
              <p className="text-gray-600 mb-4">
                Je hebt geen toestemming om gebruikersbeheer te bekijken.
                Alleen beheerders en managers hebben toegang tot deze functie.
              </p>
              <p className="text-xs text-gray-500">
                Dit is ter bescherming van privacy gegevens volgens de AVG wetgeving.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users, isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "user",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      toast({
        title: "Succesvol",
        description: "Gebruiker succesvol aangemaakt!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van de gebruiker.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Succesvol",
        description: "Gebruikersrol succesvol bijgewerkt!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het bijwerken van de rol.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "manager":
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-yellow-100 text-yellow-800">Admin</Badge>;
      case "manager":
        return <Badge className="bg-blue-100 text-blue-800">Manager</Badge>;
      default:
        return <Badge variant="secondary">Gebruiker</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium">Gebruikersbeheer</h1>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gwc-primary hover:bg-gwc-primary/90 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Gebruiker Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Gebruiker</DialogTitle>
                <DialogDescription>
                  Voeg een nieuwe gebruiker toe aan het systeem.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName">Voornaam</Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="Voornaam"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Achternaam</Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Achternaam"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="gebruiker@voorbeeld.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="username">Gebruikersnaam *</Label>
                  <Input
                    id="username"
                    {...form.register("username")}
                    placeholder="gebruikersnaam"
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Wachtwoord *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                    placeholder="••••••••"
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select onValueChange={(value) => form.setValue("role", value as any)} defaultValue="user">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Gebruiker</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsAddUserOpen(false)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gwc-primary hover:bg-gwc-primary/90 text-white"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? "Aanmaken..." : "Gebruiker Aanmaken"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {users?.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gwc-primary/10 rounded-full">
                      {getRoleIcon(user.role)}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.username
                        }
                      </h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getRoleBadge(user.role)}
                    <Select
                      onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value })}
                      defaultValue={user.role}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Gebruiker</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nog geen gebruikers geregistreerd
          </div>
        )}
      </div>
    </div>
  );
}
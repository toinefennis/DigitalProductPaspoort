import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiMessage = { message?: string };

async function requestPasswordReset(email: string): Promise<ApiMessage> {
  const response = await fetch("/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const result = (await response.json().catch(() => ({}))) as ApiMessage;
  if (!response.ok) {
    throw new Error(result.message || "We konden je aanvraag niet verwerken. Probeer het opnieuw.");
  }
  return result;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();
  const requestMutation = useMutation({ mutationFn: requestPasswordReset });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestMutation.mutate(email.trim());
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gwc-primary">
              <Mail aria-hidden="true" className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>Wachtwoord herstellen</CardTitle>
        </CardHeader>
        <CardContent>
          {requestMutation.isSuccess ? (
            <div aria-live="polite" className="space-y-4 text-center">
              <p className="text-sm leading-6 text-gray-600">
                {requestMutation.data?.message || "Als er een actief account bij dit e-mailadres hoort, ontvang je een herstelmail. Controleer ook je spammap."}
              </p>
              <Button type="button" className="w-full" onClick={() => setLocation("/login")}>
                <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
                Terug naar inloggen
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm leading-6 text-gray-600">
                Vul het e-mailadres van je account in. We sturen je een link om een nieuw wachtwoord in te stellen.
              </p>
              <div className="space-y-2">
                <Label htmlFor="recovery-email">E-mailadres</Label>
                <div className="relative">
                  <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    placeholder="naam@voorbeeld.nl"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-10"
                    aria-describedby={requestMutation.isError ? "recovery-error" : undefined}
                    required
                    disabled={requestMutation.isPending}
                  />
                </div>
              </div>
              {requestMutation.isError && (
                <p id="recovery-error" role="alert" className="text-sm text-destructive">
                  {requestMutation.error.message || "Er ging iets mis. Probeer het opnieuw."}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={requestMutation.isPending || !email.trim()}>
                <Send aria-hidden="true" className="mr-2 h-4 w-4" />
                {requestMutation.isPending ? "Aanvraag versturen..." : "Herstellink aanvragen"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-500 hover:text-gwc-primary"
                onClick={() => setLocation("/login")}
                disabled={requestMutation.isPending}
              >
                <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
                Terug naar inloggen
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

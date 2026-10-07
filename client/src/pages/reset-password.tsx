import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, LockKeyhole, Save } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

type ApiMessage = { message?: string };

function readResetToken(): string {
  const fragment = window.location.hash.replace(/^#/, "");
  const token = new URLSearchParams(fragment).get("token") || "";
  return token;
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

async function completePasswordReset(input: { token: string; password: string }): Promise<ApiMessage> {
  const response = await fetch("/api/auth/password-reset/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const result = (await response.json().catch(() => ({}))) as ApiMessage;
  if (!response.ok) {
    throw new Error(result.message || "We konden je wachtwoord niet wijzigen. Vraag een nieuwe herstellink aan.");
  }
  return result;
}

export default function ResetPassword() {
  const [token] = useState(readResetToken);
  useEffect(() => {
    if (token) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [token]);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validationError, setValidationError] = useState("");
  const [, setLocation] = useLocation();
  const resetMutation = useMutation({ mutationFn: completePasswordReset });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (Array.from(password).length < 12) {
      setValidationError("Kies een wachtwoord van minimaal 12 tekens.");
      return;
    }
    if (utf8ByteLength(password) > 72) {
      setValidationError("Het wachtwoord mag maximaal 72 bytes bevatten.");
      return;
    }
    if (password !== confirmation) {
      setValidationError("De wachtwoorden komen niet overeen.");
      return;
    }
    resetMutation.mutate({ token, password });
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gwc-primary">
              <LockKeyhole aria-hidden="true" className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>Nieuw wachtwoord instellen</CardTitle>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4">
              <p role="alert" className="text-sm leading-6 text-gray-600">
                Deze herstellink is ongeldig of onvolledig. Vraag een nieuwe link aan om verder te gaan.
              </p>
              <Button type="button" className="w-full" onClick={() => setLocation("/forgot-password")}>
                Nieuwe herstellink aanvragen
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/login")}>
                <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
                Terug naar inloggen
              </Button>
            </div>
          ) : resetMutation.isSuccess ? (
            <div aria-live="polite" className="space-y-4 text-center">
              <p className="text-sm leading-6 text-gray-600">
                Je wachtwoord is gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord.
              </p>
              <Button type="button" className="w-full" onClick={() => setLocation("/login")}>
                <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
                Naar inloggen
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm leading-6 text-gray-600">
                Gebruik minimaal 12 tekens. Een wachtwoord kan maximaal 72 bytes bevatten.
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nieuw wachtwoord</Label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-10"
                    required
                    disabled={resetMutation.isPending}
                    aria-describedby={validationError || resetMutation.isError ? "password-error" : undefined}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Herhaal nieuw wachtwoord</Label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <PasswordInput
                    id="confirm-password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="pl-10"
                    required
                    disabled={resetMutation.isPending}
                    aria-describedby={validationError || resetMutation.isError ? "password-error" : undefined}
                  />
                </div>
              </div>
              {(validationError || resetMutation.isError) && (
                <p id="password-error" role="alert" className="text-sm text-destructive">
                  {validationError || resetMutation.error?.message || "Er ging iets mis. Vraag zo nodig een nieuwe herstellink aan."}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={resetMutation.isPending || !password || !confirmation}
              >
                <Save aria-hidden="true" className="mr-2 h-4 w-4" />
                {resetMutation.isPending ? "Wachtwoord wijzigen..." : "Wachtwoord wijzigen"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-500 hover:text-gwc-primary"
                onClick={() => setLocation("/login")}
                disabled={resetMutation.isPending}
              >
                <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
                Annuleren
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

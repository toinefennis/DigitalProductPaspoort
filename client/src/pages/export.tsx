import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Database, FileText, Calendar, Lock, Upload, CheckCircle, XCircle, Loader2, ShieldCheck, Phone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

function AdminAccessRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [mobileNumber, setMobileNumber] = useState("");

  const requestMutation = useMutation({
    mutationFn: async (values: { fullName: string; mobileNumber: string }) => {
      const response = await fetch("/api/admin/access-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || "Je aanvraag kon niet worden verstuurd.");
      }
      return result as { message: string };
    },
    onSuccess: (result) => {
      toast({ title: "Aanvraag verstuurd", description: result.message });
    },
    onError: (error: Error) => {
      toast({
        title: "Aanvraag niet verstuurd",
        description: error.message || "Probeer het later opnieuw.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestMutation.mutate({
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gwc-primary" />
          Adminrechten aanvragen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-5 text-sm text-gray-600">
          Vraag een admin of superadmin om je account te beoordelen. Je naam en mobiele nummer
          worden per e-mail naar actieve admins en superadmins gestuurd. Als die niet beschikbaar
          zijn, gaat de aanvraag naar de ingestelde beheerdersmailbox. Je krijgt niet automatisch een andere rol.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-request-name">Naam</Label>
            <Input
              id="admin-request-name"
              name="fullName"
              autoComplete="name"
              maxLength={120}
              required
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                requestMutation.reset();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-request-mobile" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Mobiel nummer
            </Label>
            <Input
              id="admin-request-mobile"
              name="mobileNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              minLength={8}
              placeholder="+31 6 12345678"
              required
              value={mobileNumber}
              onChange={(event) => {
                setMobileNumber(event.target.value);
                requestMutation.reset();
              }}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={
              requestMutation.isPending ||
              requestMutation.isSuccess ||
              !fullName.trim() ||
              !mobileNumber.trim()
            }
          >
            {requestMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {requestMutation.isPending
              ? "Aanvraag versturen..."
              : requestMutation.isSuccess
                ? "Aanvraag verstuurd"
                : "Verzoek versturen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Export() {
  const [exportType, setExportType] = useState("products");
  const [exportFormat, setExportFormat] = useState("csv");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Check if user has permission to export data - Admin only
  const hasExportAccess = (currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'superadmin';

  const exportMutation = useMutation({
    mutationFn: async ({ type, format }: { type: string; format: string }) => {
      const response = await fetch(`/api/export/${type}?format=${format}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to export data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'excel' ? 'xlsx' : format;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Export succesvol",
        description: "De data is geëxporteerd en gedownload",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export mislukt",
        description: error.message || "Er is een fout opgetreden bij het exporteren",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate({ type: exportType, format: exportFormat });
  };

  if (!hasExportAccess) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Download className="h-6 w-6 text-gwc-primary" />
            <h1 className="text-xl font-medium">Database Export</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Lock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h2 className="mb-2 text-lg font-medium">Geen toegang tot exporteren</h2>
                <p className="mb-4 text-gray-600">
                  Alleen admins en superadmins kunnen gegevens exporteren.
                </p>
                <p className="text-xs text-gray-500">
                  Dit beschermt persoonsgegevens en andere vertrouwelijke gegevens.
                </p>
              </div>
            </CardContent>
          </Card>
          <AdminAccessRequestForm />
        </div>
      </div>
    );
  }

  const exportOptions = [
    { value: "products", label: "Alle producten", icon: Database },
    { value: "events", label: "Alle events", icon: Calendar },
    { value: "loans", label: "Actieve uitleningen", icon: FileText },
    { value: "users", label: "Gebruikers", icon: Database },
    { value: "full", label: "Volledige database", icon: Database },
  ];

  const formatOptions = [
    { value: "csv", label: "CSV", description: "Comma-separated values" },
    { value: "json", label: "JSON", description: "JavaScript Object Notation" },
    { value: "excel", label: "Excel (GS1)", description: "GS1-compliant Excel met GDSN/EPCIS" },
  ];

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <Download className="h-6 w-6 text-gwc-primary" />
          <h1 className="text-xl font-medium">Database Export</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exporteer Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">
                Wat wil je exporteren?
              </label>
              <div className="grid grid-cols-1 gap-3">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={exportType === option.value ? "default" : "outline"}
                      className="justify-start h-auto p-4"
                      onClick={() => setExportType(option.value)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">{option.label}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Exportformaat
              </label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      <div>
                        <div className="font-medium">{format.label}</div>
                        <div className="text-sm text-gray-600">{format.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? "Bezig met exporteren..." : "Exporteer Data"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2 text-gwc-primary" />
              MySQL Export naar gwcirculair.nl
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Exporteer alle producten naar de externe MySQL database op gwcirculair.nl/dpp.
              Dit synchroniseert de productpaspoorten met de website.
            </p>
            
            <MySQLExportSection />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2 text-blue-600" />
              Deploy DPP Presentatiepagina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload de DPP presentatiepagina naar gwcirculair.nl/dpp/[GTIN].
              Na het deployen zijn productpaspoorten publiek toegankelijk.
            </p>
            
            <FTPDeploySection />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Exportinformatie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• <strong>Producten:</strong> Alle productgegevens inclusief duurzaamheidsinformatie</p>
              <p>• <strong>Events:</strong> Alle product events (reparaties, uitleningen, retours)</p>
              <p>• <strong>Actieve uitleningen:</strong> Alleen lopende uitleningen met contactgegevens</p>
              <p>• <strong>Gebruikers:</strong> Alle geregistreerde gebruikers</p>
              <p>• <strong>Volledige database:</strong> Alle tabellen en gegevens</p>
              <br />
              <p><strong>Excel (GS1) formaat bevat:</strong></p>
              <p>• <strong>GS1 Product Information:</strong> GDSN-compliant productgegevens met GTIN, GLN</p>
              <p>• <strong>EPCIS Events:</strong> Traceability events met business steps en dispositions</p>
              <p>• <strong>Gebruikers:</strong> Contactgegevens voor borrower tracking</p>
              <p>• Volledig compatibel met GS1 standaarden voor supply chain integratie</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FTPDeploySection() {
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/deploy/ftp/test', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection test failed');
      }
      return response.json();
    },
    onSuccess: () => {
      setConnectionStatus('success');
      toast({
        title: "FTP verbinding succesvol",
        description: "Server is bereikbaar",
      });
    },
    onError: (error: any) => {
      setConnectionStatus('error');
      toast({
        title: "FTP verbinding mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/deploy/ftp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deploy failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deploy voltooid",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deploy mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setConnectionStatus('testing');
            testConnectionMutation.mutate();
          }}
          disabled={testConnectionMutation.isPending}
        >
          {testConnectionMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : connectionStatus === 'success' ? (
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          ) : connectionStatus === 'error' ? (
            <XCircle className="h-4 w-4 mr-2 text-red-500" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Test FTP Verbinding
        </Button>
        
        {connectionStatus === 'success' && (
          <span className="text-sm text-green-600">Verbonden</span>
        )}
        {connectionStatus === 'error' && (
          <span className="text-sm text-red-600">Niet verbonden</span>
        )}
      </div>

      <Button
        onClick={() => deployMutation.mutate()}
        disabled={deployMutation.isPending}
        className="w-full"
      >
        {deployMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Bezig met deployen...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Deploy DPP Pagina naar gwcirculair.nl
          </>
        )}
      </Button>
    </div>
  );
}

function MySQLExportSection() {
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/export/mysql/test', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection test failed');
      }
      return response.json();
    },
    onSuccess: () => {
      setConnectionStatus('success');
      toast({
        title: "Verbinding succesvol",
        description: "MySQL database is bereikbaar",
      });
    },
    onError: (error: any) => {
      setConnectionStatus('error');
      toast({
        title: "Verbinding mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/export/mysql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Export voltooid",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setConnectionStatus('testing');
            testConnectionMutation.mutate();
          }}
          disabled={testConnectionMutation.isPending}
        >
          {testConnectionMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : connectionStatus === 'success' ? (
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          ) : connectionStatus === 'error' ? (
            <XCircle className="h-4 w-4 mr-2 text-red-500" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Test Verbinding
        </Button>
        
        {connectionStatus === 'success' && (
          <span className="text-sm text-green-600">Verbonden</span>
        )}
        {connectionStatus === 'error' && (
          <span className="text-sm text-red-600">Niet verbonden</span>
        )}
      </div>

      <Button
        onClick={() => exportMutation.mutate()}
        disabled={exportMutation.isPending}
        className="w-full"
      >
        {exportMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Bezig met exporteren...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Exporteer naar MySQL Database
          </>
        )}
      </Button>
    </div>
  );
}
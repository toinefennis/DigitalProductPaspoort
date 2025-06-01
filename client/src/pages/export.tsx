import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Database, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Export() {
  const [exportType, setExportType] = useState("products");
  const [exportFormat, setExportFormat] = useState("csv");
  const { toast } = useToast();

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
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
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
    { value: "xlsx", label: "Excel", description: "Microsoft Excel formaat" },
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
            <CardTitle>Exportinformatie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• <strong>Producten:</strong> Alle productgegevens inclusief duurzaamheidsinformatie</p>
              <p>• <strong>Events:</strong> Alle product events (reparaties, uitleningen, retours)</p>
              <p>• <strong>Actieve uitleningen:</strong> Alleen lopende uitleningen met contactgegevens</p>
              <p>• <strong>Gebruikers:</strong> Alle geregistreerde gebruikers</p>
              <p>• <strong>Volledige database:</strong> Alle tabellen en gegevens</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
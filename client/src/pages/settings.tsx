import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Settings, Database, Camera, Bell, Info, Download, LogIn } from "lucide-react";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [cameraQuality, setCameraQuality] = useState("high");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSaveSettings = () => {
    toast({
      title: "Instellingen opgeslagen",
      description: "Uw instellingen zijn succesvol bijgewerkt.",
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="h-6 w-6 text-gwc-primary" />
        <h1 className="text-2xl font-bold text-gwc-primary">Instellingen</h1>
      </div>

      {/* Scanner Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Scanner Instellingen</span>
          </CardTitle>
          <CardDescription>
            Configureer de barcode scanner functionaliteit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Camera Kwaliteit</Label>
              <p className="text-sm text-gray-500">Hogere kwaliteit voor betere scan resultaten</p>
            </div>
            <select 
              value={cameraQuality}
              onChange={(e) => setCameraQuality(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="low">Laag</option>
              <option value="medium">Gemiddeld</option>
              <option value="high">Hoog</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Data Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Data Beheer</span>
          </CardTitle>
          <CardDescription>
            Beheer je productgegevens en back-ups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatische Back-up</Label>
              <p className="text-sm text-gray-500">Dagelijkse back-up van alle productgegevens</p>
            </div>
            <Switch
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/export")}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporteer Database
            </Button>
            <Button variant="outline" className="w-full">
              Importeer Gegevens
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Meldingen</span>
          </CardTitle>
          <CardDescription>
            Beheer je notificatie voorkeuren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notificaties</Label>
              <p className="text-sm text-gray-500">Ontvang meldingen over belangrijke updates</p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>App Informatie</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Versie</span>
            <span className="text-sm">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Laatste Update</span>
            <span className="text-sm">Vandaag</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Ontwikkelaar</span>
            <span className="text-sm">Groningen Werkt Circulair</span>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSaveSettings}
        className="w-full bg-gwc-primary hover:bg-gwc-primary/90"
      >
        Instellingen Opslaan
      </Button>
    </div>
  );
}
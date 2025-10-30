import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  RefreshCw, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Settings, 
  Database,
  Link as LinkIcon,
  AlertTriangle,
  Download,
  Upload,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface GS1Partner {
  id: string;
  name: string;
  gln: string; // Global Location Number
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  endpoint: string;
  syncEnabled: boolean;
}

interface SyncEvent {
  id: string;
  partnerId: string;
  partnerName: string;
  type: 'inventory_update' | 'product_master' | 'trade_item';
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  details: string;
  recordsProcessed?: number;
}

export default function GS1Sync() {
  const [selectedPartner, setSelectedPartner] = useState("");
  const [syncInterval, setSyncInterval] = useState("15");
  const [autoSync, setAutoSync] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Check if user has permission to access GS1 sync
  const hasGS1Access = (currentUser as any)?.role === 'admin';

  if (!hasGS1Access) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">Geen toegang</h2>
              <p className="text-gray-600 mb-4">
                Je hebt geen toestemming om GS1 synchronisaties te beheren.
                Alleen systeembeheerders hebben toegang tot deze functie.
              </p>
              <p className="text-xs text-gray-500">
                GS1 integraties bevatten gevoelige bedrijfsinformatie en zijn beperkt tot beheerders.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: partners, isLoading: partnersLoading } = useQuery<GS1Partner[]>({
    queryKey: ["/api/gs1/partners"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: syncEvents, isLoading: eventsLoading } = useQuery<SyncEvent[]>({
    queryKey: ["/api/gs1/sync-events"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["/api/gs1/sync-status"],
    refetchInterval: 5000, // Check status every 5 seconds
  });

  const manualSyncMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      return await apiRequest("POST", "/api/gs1/sync", { partnerId });
    },
    onSuccess: () => {
      toast({
        title: "Synchronisatie gestart",
        description: "GS1 inventaris synchronisatie is geïnitieerd",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gs1/sync-events"] });
    },
    onError: (error: any) => {
      toast({
        title: "Synchronisatie mislukt",
        description: error.message || "Er is een fout opgetreden bij de synchronisatie",
        variant: "destructive",
      });
    },
  });

  const addPartnerMutation = useMutation({
    mutationFn: async (partner: Partial<GS1Partner>) => {
      return await apiRequest("POST", "/api/gs1/partners", partner);
    },
    onSuccess: () => {
      toast({
        title: "Partner toegevoegd",
        description: "GS1 partner is succesvol toegevoegd",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gs1/partners"] });
    },
    onError: (error: any) => {
      toast({
        title: "Partner toevoegen mislukt",
        description: error.message || "Er is een fout opgetreden",
        variant: "destructive",
      });
    },
  });

  const togglePartnerMutation = useMutation({
    mutationFn: async ({ partnerId, enabled }: { partnerId: string; enabled: boolean }) => {
      return await apiRequest("PATCH", `/api/gs1/partners/${partnerId}`, { syncEnabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gs1/partners"] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'disconnected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'disconnected':
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (partnersLoading && eventsLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
        <div className="flex items-center space-x-3 mb-6">
          <Globe className="h-6 w-6 text-gwc-primary" />
          <h1 className="text-xl font-medium">GS1 Inventory Sync</h1>
          <Badge variant="secondary">
            {(syncStatus as any)?.isRunning ? "Actief" : "Inactief"}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="inline-flex w-full overflow-x-auto overflow-y-hidden flex-nowrap h-auto min-h-[44px]">
            <TabsTrigger value="overview" className="whitespace-nowrap flex-shrink-0 px-4">Overzicht</TabsTrigger>
            <TabsTrigger value="partners" className="whitespace-nowrap flex-shrink-0 px-4">Partners</TabsTrigger>
            <TabsTrigger value="events" className="whitespace-nowrap flex-shrink-0 px-4">Sync Events</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap flex-shrink-0 px-4">Instellingen</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Partner Status Cards */}
              {partners?.map((partner) => (
                <Card key={partner.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{partner.name}</CardTitle>
                      <Badge className={getStatusColor(partner.status)}>
                        {getStatusIcon(partner.status)}
                        <span className="ml-1 capitalize">{partner.status}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p><strong>GLN:</strong> {partner.gln}</p>
                      <p><strong>Laatste sync:</strong> {formatDistanceToNow(new Date(partner.lastSync), { addSuffix: true, locale: nl })}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => manualSyncMutation.mutate(partner.id)}
                        disabled={manualSyncMutation.isPending}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync Nu
                      </Button>
                      <Button
                        size="sm"
                        variant={partner.syncEnabled ? "default" : "outline"}
                        onClick={() => togglePartnerMutation.mutate({ 
                          partnerId: partner.id, 
                          enabled: !partner.syncEnabled 
                        })}
                      >
                        {partner.syncEnabled ? "Ingeschakeld" : "Uitgeschakeld"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="partners">
            <Card>
              <CardHeader>
                <CardTitle>GS1 Partners Beheren</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partner-name">Partner Naam</Label>
                    <Input id="partner-name" placeholder="Bijv. Albert Heijn B.V." />
                  </div>
                  <div>
                    <Label htmlFor="partner-gln">GLN (Global Location Number)</Label>
                    <Input id="partner-gln" placeholder="Bijv. 8714100000000" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="partner-endpoint">GDSN Endpoint URL</Label>
                    <Input id="partner-endpoint" placeholder="https://api.partner.com/gdsn/v1" />
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    // Implementation will be added when form values are captured
                    toast({
                      title: "Functie in ontwikkeling",
                      description: "Partner toevoegen functionaliteit wordt binnenkort toegevoegd",
                    });
                  }}
                  className="w-full"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Partner Toevoegen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Synchronisatie Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncEvents?.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(event.status)}
                          <div>
                            <p className="font-medium">{event.partnerName}</p>
                            <p className="text-sm text-gray-600">{event.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: nl })}
                          </p>
                        </div>
                      </div>
                      {event.details && (
                        <p className="text-sm text-gray-600 mt-2">{event.details}</p>
                      )}
                      {event.recordsProcessed && (
                        <p className="text-xs text-gray-500 mt-1">
                          {event.recordsProcessed} records verwerkt
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Synchronisatie Instellingen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatische Synchronisatie</Label>
                      <p className="text-sm text-gray-600">
                        Schakel automatische synchronisatie in/uit
                      </p>
                    </div>
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>
                  
                  <div>
                    <Label htmlFor="sync-interval">Sync Interval (minuten)</Label>
                    <Select value={syncInterval} onValueChange={setSyncInterval}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minuten</SelectItem>
                        <SelectItem value="15">15 minuten</SelectItem>
                        <SelectItem value="30">30 minuten</SelectItem>
                        <SelectItem value="60">1 uur</SelectItem>
                        <SelectItem value="240">4 uur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Instellingen Opslaan
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>GS1 Configuratie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="company-gln">Bedrijf GLN</Label>
                    <Input id="company-gln" placeholder="Jouw Global Location Number" />
                  </div>
                  <div>
                    <Label htmlFor="gdsn-certificate">GDSN Certificaat</Label>
                    <Textarea 
                      id="gdsn-certificate" 
                      placeholder="PEM-geformatteerd certificaat voor GS1 authenticatie"
                      rows={4}
                    />
                  </div>
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Certificaat Uploaden
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
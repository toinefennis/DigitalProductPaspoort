import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Wrench, Clock, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DashboardStats, Event, Product } from "@shared/schema";

function StatsCard({ title, value, icon: Icon, color }: {
  title: string;
  value: number;
  icon: typeof Package;
  color: string;
}) {
  return (
    <Card className="shadow-material-1">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-2xl font-medium ${color}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityCard({ activity, onDelete }: { 
  activity: Event & { product: Product };
  onDelete?: (eventId: number) => void;
}) {
  const { user: currentUser } = useAuth();
  const isAdmin = (currentUser as any)?.role === 'admin';

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "reparatie":
        return <Wrench className="h-4 w-4 text-gwc-success" />;
      case "uitleen":
        return <Clock className="h-4 w-4 text-gwc-warning" />;
      case "retour":
        return <RefreshCw className="h-4 w-4 text-gwc-success" />;
      default:
        return <Package className="h-4 w-4 text-gwc-secondary" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "reparatie":
        return "bg-gwc-success bg-opacity-10";
      case "uitleen":
        return "bg-gwc-warning bg-opacity-10";
      case "retour":
        return "bg-gwc-success bg-opacity-10";
      default:
        return "bg-gwc-secondary bg-opacity-10";
    }
  };

  return (
    <Card className="shadow-material-1">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`flex-shrink-0 w-10 h-10 ${getEventColor(activity.eventType)} rounded-full flex items-center justify-center`}>
              {getEventIcon(activity.eventType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.description}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(activity.createdAt), "PPp", { locale: nl })}
              </p>
              <p className="text-xs text-gwc-primary">GTIN: {activity.product.gtin}</p>
            </div>
          </div>
          {isAdmin && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(activity.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<(Event & { product: Product })[]>({
    queryKey: ["/api/dashboard/activities"],
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest(`/api/events/${eventId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Event verwijderd",
        description: "Het event is succesvol verwijderd uit de historie.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van het event.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteEvent = (eventId: number) => {
    if (confirm("Weet je zeker dat je dit event wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  if (statsLoading || activitiesLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-material-1">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Stats Cards */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Producten"
            value={stats?.totalProducts || 0}
            icon={Package}
            color="text-gwc-primary"
          />
          <StatsCard
            title="Reparaties"
            value={stats?.totalRepairs || 0}
            icon={Wrench}
            color="text-gwc-success"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Uitgeleend"
            value={stats?.itemsOnLoan || 0}
            icon={Clock}
            color="text-gwc-warning"
          />
          <StatsCard
            title="Remakes"
            value={stats?.remadeItems || 0}
            icon={RefreshCw}
            color="text-gwc-secondary"
          />
        </div>
      </div>

      {/* Recent Activities */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-medium mb-4">Recente Activiteiten</h2>
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        ) : (
          <Card className="shadow-material-1">
            <CardContent className="p-4 text-center text-gray-500">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nog geen activiteiten</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

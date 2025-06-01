import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Check, CheckCheck, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { Notification } from "@shared/schema";

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      toast({
        title: "Succesvol",
        description: "Alle meldingen gemarkeerd als gelezen",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "product_change":
        return <Package className="h-5 w-5 text-blue-600" />;
      case "status_update":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationTypeBadge = (type: string) => {
    switch (type) {
      case "product_change":
        return <Badge className="bg-blue-100 text-blue-800">Product Wijziging</Badge>;
      case "status_update":
        return <Badge className="bg-orange-100 text-orange-800">Status Update</Badge>;
      default:
        return <Badge variant="secondary">Systeem</Badge>;
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
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
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-medium">Meldingen</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} nieuw
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Alles als gelezen markeren
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {notifications?.map((notification) => (
            <Card 
              key={notification.id}
              className={`transition-all ${
                !notification.isRead 
                  ? "bg-blue-50 border-blue-200 shadow-sm" 
                  : "bg-white"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm leading-5">
                        {notification.title}
                      </h3>
                      <div className="flex items-center space-x-2 ml-2">
                        {getNotificationTypeBadge(notification.type)}
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      {notification.message}
                    </p>

                    {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="space-y-1 text-xs">
                          {notification.metadata.action && (
                            <div>
                              <span className="font-medium text-gray-600">Actie:</span>
                              <span className="ml-2 text-gray-800">{notification.metadata.action}</span>
                            </div>
                          )}
                          {notification.metadata.oldValue && notification.metadata.newValue && (
                            <div>
                              <span className="font-medium text-gray-600">Wijziging:</span>
                              <span className="ml-2 text-red-600 line-through">{notification.metadata.oldValue}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600">{notification.metadata.newValue}</span>
                            </div>
                          )}
                          {notification.metadata.changedBy && (
                            <div>
                              <span className="font-medium text-gray-600">Door:</span>
                              <span className="ml-2 text-gray-800">{notification.metadata.changedBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.createdAt), { 
                          addSuffix: true, 
                          locale: nl 
                        })}
                      </span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {notifications?.length === 0 && (
          <div className="text-center py-12">
            <BellOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen meldingen</h3>
            <p className="text-gray-600">Je hebt momenteel geen meldingen.</p>
          </div>
        )}
      </div>
    </div>
  );
}
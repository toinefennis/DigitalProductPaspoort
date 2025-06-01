import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, Check, CheckCheck, Package, AlertCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { Notification, Product } from "@shared/schema";

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddNotification, setShowAddNotification] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [notificationType, setNotificationType] = useState("loan_reminder");

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
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

  const createNotificationMutation = useMutation({
    mutationFn: async (data: { productId: number; type: string; message: string }) => {
      return await apiRequest("POST", "/api/notifications", data);
    },
    onSuccess: () => {
      toast({
        title: "Melding aangemaakt",
        description: "Nieuwe melding is succesvol aangemaakt",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setShowAddNotification(false);
      setSelectedProduct("");
    },
  });

  const handleCreateNotification = () => {
    if (!selectedProduct) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een product",
        variant: "destructive",
      });
      return;
    }

    const product = products?.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    let message = "";
    switch (notificationType) {
      case "loan_reminder":
        message = `Product "${product.name}" is beschikbaar voor uitleen`;
        break;
      case "return_reminder":
        message = `Herinnering: Product "${product.name}" moet worden teruggebracht`;
        break;
      case "maintenance":
        message = `Product "${product.name}" heeft onderhoud nodig`;
        break;
      default:
        message = `Update voor product "${product.name}"`;
    }

    createNotificationMutation.mutate({
      productId: product.id,
      type: notificationType,
      message,
    });
  };

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
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddNotification(!showAddNotification)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe melding
            </Button>
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
        </div>

        {/* Add Notification Form */}
        {showAddNotification && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Nieuwe melding aanmaken</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-select">Product selecteren</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies een product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} ({product.gtin})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notification-type">Type melding</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan_reminder">Beschikbaar voor uitleen</SelectItem>
                      <SelectItem value="return_reminder">Retour herinnering</SelectItem>
                      <SelectItem value="maintenance">Onderhoud nodig</SelectItem>
                      <SelectItem value="status_update">Status update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleCreateNotification}
                    disabled={createNotificationMutation.isPending || !selectedProduct}
                  >
                    {createNotificationMutation.isPending ? "Aanmaken..." : "Melding aanmaken"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddNotification(false)}
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
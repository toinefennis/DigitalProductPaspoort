import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Tag, QrCode, Wrench, Clock, CheckCircle } from "lucide-react";
import { EventTimeline } from "@/components/event-timeline";
import type { ProductWithEvents } from "@shared/schema";

export default function ProductDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  
  const productId = params.id;
  const gtin = params.gtin;
  
  const { data: product, isLoading, error } = useQuery<ProductWithEvents>({
    queryKey: gtin ? [`/api/products/gtin/${gtin}`] : [`/api/products/${productId}`],
    enabled: !!(productId || gtin),
  });

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200"></div>
          <div className="p-4 space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-medium mb-2">Product niet gevonden</h2>
            <p className="text-gray-600 mb-4">
              Het product met code {gtin || productId} bestaat niet in ons systeem.
            </p>
            <Button onClick={() => setLocation("/")}>
              Terug naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "beschikbaar":
        return <Badge className="bg-gwc-success text-white">Beschikbaar</Badge>;
      case "uitgeleend":
        return <Badge className="bg-gwc-warning text-white">Uitgeleend</Badge>;
      case "in_reparatie":
        return <Badge className="bg-gwc-error text-white">In Reparatie</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="relative">
        {/* Product Image */}
        {product.photoUrl ? (
          <img 
            src={product.photoUrl} 
            alt={product.name}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
            <QrCode className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Back button overlay */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black bg-opacity-50 text-white hover:bg-black hover:bg-opacity-70"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Product Information */}
      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div>
          <h1 className="text-2xl font-medium mb-2">{product.name}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center">
              <Tag className="h-4 w-4 mr-1" />
              {product.type}
            </span>
            <span className="flex items-center">
              <QrCode className="h-4 w-4 mr-1" />
              {product.gtin}
            </span>
          </div>
          {product.description && (
            <p className="text-gray-700">{product.description}</p>
          )}
        </div>

        {/* Material Info */}
        {product.material && (
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gwc-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.17,22L6.58,19.58C8.84,20.81 11.6,21.5 14.5,21.5C15.9,21.5 17.24,21.35 18.53,21.07L20.74,22.5L21.74,21.07C20.37,16.66 17.58,10.38 17,8M12.5,10C13.61,10 14.5,10.9 14.5,12S13.61,14 12.5,14 10.5,13.1 10.5,12 11.39,10 12.5,10M12,7.5A4.5,4.5 0 0,1 16.5,12A4.5,4.5 0 0,1 12,16.5A4.5,4.5 0 0,1 7.5,12A4.5,4.5 0 0,1 12,7.5M5.6,16.25C7.26,12.96 9.97,8.5 12,8.5C14.03,8.5 16.74,12.96 18.4,16.25C16.74,19.54 14.03,24 12,24C9.97,24 7.26,19.54 5.6,16.25Z" />
                </svg>
                Materiaalsamenstelling
              </h3>
              <p className="text-sm text-gray-700">{product.material}</p>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-gwc-success bg-opacity-10 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-gwc-success" />
            {getStatusBadge(product.status)}
          </div>
          <span className="text-xs text-gray-500">
            Bijgewerkt {new Date(product.updatedAt).toLocaleDateString("nl-NL")}
          </span>
        </div>

        {/* Input Sources (for remakes/batches) */}
        {product.sourceGtins && product.sourceGtins.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Input Bronnen</h3>
              <div className="space-y-2">
                {product.sourceGtins.map((sourceGtin, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-mono">{sourceGtin}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/product/gtin/${sourceGtin}`)}
                    >
                      Bekijk
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons (Admin only) */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="flex items-center justify-center space-x-2 bg-gwc-primary hover:bg-gwc-primary/90 text-white"
            onClick={() => setLocation(`/event-log/${product.id}?type=reparatie`)}
          >
            <Wrench className="h-4 w-4" />
            <span className="text-sm font-medium">Reparatie</span>
          </Button>
          <Button
            className="flex items-center justify-center space-x-2 bg-gwc-warning hover:bg-gwc-warning/90 text-white"
            onClick={() => setLocation(`/event-log/${product.id}?type=uitleen`)}
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Uitleen</span>
          </Button>
        </div>

        {/* Event Timeline */}
        <EventTimeline events={product.events} />
      </div>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, QrCode } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
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

  const getTypeIcon = (type: string) => {
    // You can add different icons for different types
    return <Package className="h-4 w-4" />;
  };

  return (
    <Card 
      className="shadow-material-1 hover:shadow-material-2 transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Product Image or Placeholder */}
          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {product.photoUrl ? (
              <img 
                src={product.photoUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="h-8 w-8 text-gray-400" />
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-medium text-sm truncate">{product.name}</h3>
              {getStatusBadge(product.status)}
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-gray-600 mb-2">
              <span className="flex items-center">
                {getTypeIcon(product.type)}
                <span className="ml-1 capitalize">{product.type}</span>
              </span>
              <span className="flex items-center">
                <QrCode className="h-3 w-3 mr-1" />
                {product.gtin}
              </span>
            </div>

            {product.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {product.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              {product.material && (
                <span className="text-xs text-gwc-primary">
                  {product.material.length > 20 
                    ? `${product.material.substring(0, 20)}...` 
                    : product.material
                  }
                </span>
              )}
              <span className="text-xs text-gray-500">
                {format(new Date(product.updatedAt), "dd MMM", { locale: nl })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

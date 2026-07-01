import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Search, QrCode, LogIn, Leaf, Recycle, Info, ChevronRight, Shirt } from "lucide-react";
import type { Product } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

function statusLabel(status: string) {
  switch (status) {
    case "beschikbaar": return { label: "Beschikbaar", color: "bg-green-100 text-green-700" };
    case "uitgeleend": return { label: "Uitgeleend", color: "bg-orange-100 text-orange-700" };
    case "in_reparatie": return { label: "In reparatie", color: "bg-blue-100 text-blue-700" };
    default: return { label: status, color: "bg-gray-100 text-gray-600" };
  }
}

function ProductRow({ product }: { product: Product }) {
  const { label, color } = statusLabel(product.status);
  const [, setLocation] = useLocation();

  return (
    <button
      onClick={() => setLocation(`/dpp/${product.gtin}`)}
      className="w-full text-left flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:border-gwc-primary/30 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      {product.photoUrl ? (
        <img
          src={product.photoUrl}
          alt={product.name}
          className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-100"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <Shirt className="w-7 h-7 text-gwc-primary/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{product.name}</div>
        {product.brand && (
          <div className="text-sm text-gray-500 truncate">{product.brand}</div>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
          {product.repairabilityIndex && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Recycle className="w-3 h-3" /> {product.repairabilityIndex}/10
            </span>
          )}
          {product.material && (
            <span className="text-xs text-gray-400 truncate max-w-[120px]">{product.material}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <QrCode className="w-4 h-4 text-gwc-primary/40" />
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  );
}

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>("alle");
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filters = [
    { value: "alle", label: "Alle" },
    { value: "beschikbaar", label: "Beschikbaar" },
    { value: "uitgeleend", label: "Uitgeleend" },
    { value: "in_reparatie", label: "In reparatie" },
  ];

  const filtered = (products ?? []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gtin.includes(searchTerm) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.material?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "alle" || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Login banner */}
      {!isAuthenticated && (
        <div className="bg-gwc-primary text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>Log in voor beheer, uitlening en meer</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0 h-8 text-gwc-primary font-semibold"
            onClick={() => setLocation("/login")}
          >
            <LogIn className="w-3.5 h-3.5 mr-1.5" />
            Inloggen
          </Button>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Product Catalogus</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-gwc-primary" />
              Groningen Werkt Circulair — Digitale Productpaspoorten
            </p>
          </div>
          {!isLoading && (
            <span className="text-sm text-gray-400 font-medium">{filtered.length} producten</span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Zoek op naam, GTIN, merk of materiaal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-gwc-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Shirt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Geen producten gevonden</p>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-gwc-primary text-sm mt-2 underline">
                Zoekopdracht wissen
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Footer info */}
        {!isLoading && filtered.length > 0 && (
          <div className="text-center pt-4 pb-2">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              Klik op een product om het volledige digitale paspoort te bekijken
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

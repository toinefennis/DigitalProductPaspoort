import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Pencil, Trash2 } from "lucide-react";
import type { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const isSuperadmin = user?.role === "superadmin";

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest("DELETE", `/api/products/${productId}`);
      return response.json() as Promise<{ message: string }>;
    },
    onSuccess: async (result) => {
      toast({ title: "Product verwijderd", description: result.message });
      setProductToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Verwijderen mislukt",
        description: error.message || "Het product kon niet worden verwijderd.",
        variant: "destructive",
      });
    },
  });

  const handleProductClick = (product: Product) => {
    setLocation(`/product/${product.id}`);
  };

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.gtin.includes(searchTerm) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gwc-primary">Alle Producten</h1>
      
      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Zoek op naam, GTIN of merk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isSuperadmin ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>GTIN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                      {searchTerm ? "Geen producten gevonden" : "Nog geen producten toegevoegd"}
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="min-w-48 font-medium">{product.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{product.gtin}</TableCell>
                    <TableCell>{product.type}</TableCell>
                    <TableCell>{product.brand || "—"}</TableCell>
                    <TableCell>{product.status}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/product/${product.id}`)}
                          aria-label={`Product ${product.name} bewerken`}
                        >
                          <Pencil className="mr-1.5 h-4 w-4" />
                          Bewerken
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setProductToDelete(product)}
                          aria-label={`Product ${product.name} verwijderen`}
                          disabled={deleteProductMutation.isPending}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Verwijderen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-8 text-center text-gray-500">
              {searchTerm ? "Geen producten gevonden" : "Nog geen producten toegevoegd"}
            </div>
          ) : (
          filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onClick={() => handleProductClick(product)}
            />
          ))
          )}
        </div>
      )}

      <AlertDialog
        open={productToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteProductMutation.isPending) setProductToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Product definitief verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete && (
                <>
                  <span className="font-medium text-gray-900">{productToDelete.name}</span>
                  {" "}en de gekoppelde productgebeurtenissen en meldingen worden permanent verwijderd.
                  Gekoppelde verhalen en GS1-snapshots blijven bewaard; externe GS1-gegevens worden niet aangepast.
                  {" "}Deze actie kan niet ongedaan worden gemaakt.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProductMutation.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={!productToDelete || deleteProductMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (productToDelete) deleteProductMutation.mutate(productToDelete.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProductMutation.isPending ? "Verwijderen..." : "Definitief verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
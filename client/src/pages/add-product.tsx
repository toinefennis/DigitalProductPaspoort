import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Camera, QrCode, Plus, Package, Recycle, Database, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";

const formSchema = insertProductSchema.extend({
  photo: z.instanceof(File).optional(),
  sourceGtinsInput: z.string().optional(),
  materialComposition: z.string().optional(),
  materialWeight: z.string().optional(),
  materialDurability: z.string().optional(),
  materialRecyclability: z.string().optional(),
  materialCertifications: z.string().optional(),
  databaseType: z.enum(['product', 'material', 'gtin']).default('product'),
  addToGtinRegistry: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function AddProduct() {
  const [location, setLocation] = useLocation();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [inputSources, setInputSources] = useState<string[]>([]);
  const [newInputSource, setNewInputSource] = useState("");
  const [activeTab, setActiveTab] = useState("product");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Check user permissions for GTIN registration
  const canManageGtin = (currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'manager';

  // Parse URL parameters for pre-filled data from scanner
  const [currentLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledGtin = urlParams.get('gtin') || '';
  const scanType = urlParams.get('scanType') || 'barcode';
  
  console.log('Current location:', currentLocation);
  console.log('Window location search:', window.location.search);
  console.log('URL params:', urlParams.toString());
  console.log('Extracted GTIN:', prefilledGtin);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "product",
      status: "available",
      gtin: prefilledGtin,
      sourceGtins: [],
      materialProperties: {},
      databaseType: 'product',
      addToGtinRegistry: false,
    },
  });

  console.log('Prefilled GTIN from URL:', prefilledGtin);

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle additional photo selection
  const handleAdditionalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAdditionalPhotos(prev => [...prev, ...files]);
  };

  // Remove additional photo
  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Add input source
  const addInputSource = () => {
    if (newInputSource.trim()) {
      setInputSources(prev => [...prev, newInputSource.trim()]);
      setNewInputSource("");
    }
  };

  // Remove input source
  const removeInputSource = (index: number) => {
    setInputSources(prev => prev.filter((_, i) => i !== index));
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product succesvol aangemaakt!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van het product.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Process form data
    const submitData = {
      ...data,
      sourceGtins: inputSources,
      materialProperties: {
        composition: data.materialComposition || "",
        weight: data.materialWeight || "",
        durability: data.materialDurability || "",
        recyclability: data.materialRecyclability || "",
        certifications: data.materialCertifications || "",
      },
    };

    // Remove temporary fields
    delete submitData.sourceGtinsInput;
    delete submitData.materialComposition;
    delete submitData.materialWeight;
    delete submitData.materialDurability;
    delete submitData.materialRecyclability;
    delete submitData.materialCertifications;
    
    // Create FormData for file upload
    const formData = new FormData();
    Object.entries(submitData).forEach(([key, value]) => {
      if (key === "sourceGtins" || key === "materialProperties") {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    if (selectedPhoto) {
      formData.append("photo", selectedPhoto);
    }

    // Use fetch directly for file upload
    fetch("/api/products", {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create product");
        }
        return response.json();
      })
      .then(() => {
        toast({
          title: "Success",
          description: "Product succesvol aangemaakt!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        setLocation("/");
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error.message || "Er is een fout opgetreden bij het aanmaken van het product.",
          variant: "destructive",
        });
      });
  };

  const ProductForm = ({ databaseType }: { databaseType: 'product' | 'material' | 'gtin' }) => (
    <form onSubmit={handleSubmit((data) => onSubmit({...data, databaseType}))} className="space-y-6">
      {/* Photo Upload */}
      <div>
        <Label className="block text-sm font-medium mb-2">Productfoto</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center bg-gray-50 relative overflow-hidden">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Tap om foto toe te voegen</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Productnaam *</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Bijv. Laptop Dell XPS"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="gtin">GTIN/Barcode</Label>
          <Input
            id="gtin"
            {...register("gtin")}
            placeholder="Bijv. 1234567890123"
          />
          {errors.gtin && (
            <p className="text-sm text-red-600 mt-1">{errors.gtin.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type *</Label>
          <Select onValueChange={(value) => setValue("type", value)} defaultValue={watch("type")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="component">Component</SelectItem>
              <SelectItem value="material">Materiaal</SelectItem>
              <SelectItem value="tool">Gereedschap</SelectItem>
              <SelectItem value="equipment">Apparatuur</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="brand">Merk</Label>
          <Input
            id="brand"
            {...register("brand")}
            placeholder="Bijv. Dell"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Beschrijving</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Beschrijf het product..."
          className="h-20"
        />
      </div>

      {databaseType === 'product' && canManageGtin && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="addToGtinRegistry"
            checked={watch("addToGtinRegistry")}
            onCheckedChange={(checked) => setValue("addToGtinRegistry", !!checked)}
          />
          <Label htmlFor="addToGtinRegistry" className="text-sm">
            Ook toevoegen aan GTIN registratie database
          </Label>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation("/")}
        >
          Annuleren
        </Button>
        <Button type="submit">
          {databaseType === 'product' && 'Product Toevoegen'}
          {databaseType === 'material' && 'Materiaal Toevoegen'}
          {databaseType === 'gtin' && 'GTIN Registreren'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium">Item Toevoegen</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="product" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Product</span>
            </TabsTrigger>
            <TabsTrigger value="material" className="flex items-center space-x-2">
              <Recycle className="h-4 w-4" />
              <span>Materiaal</span>
            </TabsTrigger>
            <TabsTrigger 
              value="gtin" 
              className="flex items-center space-x-2"
              disabled={!canManageGtin}
            >
              <Database className="h-4 w-4" />
              <span>GTIN</span>
              {!canManageGtin && <Lock className="h-3 w-3" />}
            </TabsTrigger>
          </TabsList>

          {!canManageGtin && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                GTIN registratie is alleen beschikbaar voor managers en beheerders.
              </p>
            </div>
          )}

          <TabsContent value="product">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Product Database</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Voeg een nieuw product toe aan de standaard productdatabase voor inventaris en uitlening.
                </p>
              </CardHeader>
              <CardContent>
                <ProductForm databaseType="product" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="material">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Recycle className="h-5 w-5" />
                  <span>Materialenbank</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Voeg materialen toe aan de materialenbank voor hergebruik en circulaire economie.
                </p>
              </CardHeader>
              <CardContent>
                <ProductForm databaseType="material" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gtin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>GTIN Registratie</span>
                  <Badge variant="secondary">Admin/Manager</Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Registreer nieuwe GTIN codes in de centrale database voor GS1 compliantie.
                </p>
              </CardHeader>
              <CardContent>
                {canManageGtin ? (
                  <ProductForm databaseType="gtin" />
                ) : (
                  <div className="text-center py-8">
                    <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Alleen managers en beheerders kunnen GTIN registraties uitvoeren.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MVP Disclaimer */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            <strong>MVP Disclaimer:</strong> Dit is een proof-of-concept voor het Groningen Werkt Circulair pilot project. 
            Voor meer informatie bezoek{" "}
            <a 
              href="https://groningenwerktcirculair.info" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-blue-800"
            >
              groningenwerktcirculair.info
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
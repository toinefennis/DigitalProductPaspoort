import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Tag, QrCode, Wrench, Clock, CheckCircle, Edit3, Save, X, Leaf, Globe, Droplets } from "lucide-react";
import { EventTimeline } from "@/components/event-timeline";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { ProductWithEvents, InsertProduct } from "@shared/schema";

const editFormSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
  brand: z.string().optional(),
  material: z.string().optional(),
  status: z.string(),
  collection: z.string().optional(),
  story: z.string().optional(),
  origin: z.string().optional(),
  washingInstructions: z.string().optional(),
  co2Footprint: z.string().optional(),
  esgScore: z.string().optional(),
  materialComposition: z.string().optional(),
  materialWeight: z.string().optional(),
  materialDurability: z.string().optional(),
  materialRecyclability: z.string().optional(),
  materialCertifications: z.string().optional(),
});

type EditFormData = z.infer<typeof editFormSchema>;

export default function ProductDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [careInstructions, setCareInstructions] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const productId = params.id;
  const gtin = params.gtin;
  
  const { data: product, isLoading, error } = useQuery<ProductWithEvents>({
    queryKey: gtin ? [`/api/products/gtin/${gtin}`] : [`/api/products/${productId}`],
    enabled: !!(productId || gtin),
  });

  // Fetch materials on component mount
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/materials');
        if (response.ok) {
          const materialsData = await response.json();
          setMaterials(materialsData);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    fetchMaterials();
  }, []);

  // Handle material change to auto-fill washing instructions
  const handleMaterialChange = async (materialName: string) => {
    try {
      const response = await fetch(`/api/materials/${encodeURIComponent(materialName)}/care`);
      if (response.ok) {
        const careData = await response.json();
        setCareInstructions(careData);
        
        // Auto-fill washing instructions in form
        const washingInstruction = `${careData.washing.instruction}, ${careData.drying.instruction}, ${careData.ironing.instruction}`;
        editForm.setValue('washingInstructions', washingInstruction);
      }
    } catch (error) {
      console.error('Error fetching care instructions:', error);
    }
  };

  // Load care instructions when product loads
  useEffect(() => {
    if (product?.material) {
      handleMaterialChange(product.material);
    }
  }, [product?.material]);

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      description: "",
      brand: "",
      material: "",
      status: "beschikbaar",
      collection: "",
      story: "",
      origin: "",
      washingInstructions: "",
      co2Footprint: "",
      esgScore: "",
      materialComposition: "",
      materialWeight: "",
      materialDurability: "",
      materialRecyclability: "",
      materialCertifications: "",
    },
  });

  // Photo upload handler
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) { // 15MB limit
        toast({
          title: "Bestand te groot",
          description: "De foto mag maximaal 15MB zijn.",
          variant: "destructive",
        });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      console.log("Starting product update...");
      
      // Process material properties
      const materialProperties = {
        composition: data.materialComposition || undefined,
        weight: data.materialWeight || undefined,
        durability: data.materialDurability || undefined,
        recyclability: data.materialRecyclability || undefined,
        certifications: data.materialCertifications ? data.materialCertifications.split(',').map(c => c.trim()).filter(c => c) : undefined,
      };

      // Upload photo if provided
      let photoUrl = undefined;
      if (photoFile) {
        console.log("Uploading photo...");
        const formData = new FormData();
        formData.append('photo', photoFile);

        try {
          const photoResponse = await fetch('/api/upload/photo', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          console.log("Photo response status:", photoResponse.status);
          
          if (!photoResponse.ok) {
            const errorText = await photoResponse.text();
            console.error("Photo upload error response:", errorText);
            throw new Error(`Foto upload mislukt: ${errorText || photoResponse.statusText}`);
          }

          const photoResult = await photoResponse.json();
          photoUrl = photoResult.url;
          console.log("Photo uploaded successfully:", photoUrl);
        } catch (error) {
          console.error("Photo upload failed:", error);
          throw error;
        }
      }

      const updateData: any = {
        ...data,
        materialProperties: Object.keys(materialProperties).some(key => materialProperties[key as keyof typeof materialProperties]) 
          ? materialProperties 
          : undefined,
      };

      // Add photo URL if available
      if (photoUrl) {
        updateData.photo = photoUrl;
      }

      // Remove individual material property fields
      delete updateData.materialComposition;
      delete updateData.materialWeight;
      delete updateData.materialDurability;
      delete updateData.materialRecyclability;
      delete updateData.materialCertifications;

      console.log("Sending product update:", updateData);
      const result = await apiRequest("PATCH", `/api/products/${product!.id}`, updateData);
      console.log("Product update completed");
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product succesvol bijgewerkt!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/gtin/${gtin}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Er is een fout opgetreden bij het bijwerken.",
        variant: "destructive",
      });
    },
  });

  // Convert product to GTIN registry
  const convertToGtinRegistry = () => {
    if (!product) return;
    
    // Navigate to GTIN registry with pre-filled data
    const prefilledData = {
      gtin: product.gtin || '',
      productName: product.name || '',
      brandName: product.brand || '',
      productDescription: product.description || '',
      productWeight: 1, // Default weight
      fiberComposition: product.material ? JSON.stringify([{
        component: "hoofdstof",
        vezels: [{
          code: product.material.toUpperCase().substring(0, 3),
          naam: product.material,
          percentage: 100
        }]
      }]) : '',
      countryOfOrigin: product.origin || '',
      productionDate: new Date().toISOString().split('T')[0]
    };
    
    // Store the data temporarily and navigate
    sessionStorage.setItem('gtinConversionData', JSON.stringify(prefilledData));
    setLocation('/gtin-registry?convert=true');
    
    toast({
      title: "Conversie gestart",
      description: "Product wordt geconverteerd naar GTIN register met vooringevulde gegevens.",
    });
  };

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      const materialProps = product.materialProperties || {};
      editForm.reset({
        name: product.name || "",
        description: product.description || "",
        brand: product.brand || "",
        material: product.material || "",
        status: product.status || "beschikbaar",
        collection: product.collection || "",
        story: product.story || "",
        origin: product.origin || "",
        washingInstructions: product.washingInstructions || "",
        co2Footprint: product.co2Footprint || "",
        esgScore: product.esgScore || "",
        materialComposition: materialProps.composition || "",
        materialWeight: materialProps.weight || "",
        materialDurability: materialProps.durability || "",
        materialRecyclability: materialProps.recyclability || "",
        materialCertifications: materialProps.certifications?.join(', ') || "",
      });
    }
  }, [product, editForm]);

  const onSubmit = (data: EditFormData) => {
    updateMutation.mutate(data);
  };

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

      {/* Action Buttons */}
      <div className="px-4 pt-4 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Annuleren
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4 mr-2" />
              Product Bewerken
            </>
          )}
        </Button>
        
        {/* GTIN Registry Conversion Button (Manager/Admin only) */}
        {(user?.role === 'manager' || user?.role === 'admin') && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => convertToGtinRegistry()}
          >
            <QrCode className="h-4 w-4 mr-2" />
            Converteer naar GTIN Register
          </Button>
        )}
      </div>

      {/* Product Information */}
      <div className="p-4 space-y-6">
        {isEditing ? (
          /* Edit Form */
          <form onSubmit={editForm.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info - Edit Mode */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Productnaam *</Label>
                <Input
                  id="name"
                  {...editForm.register("name")}
                  placeholder="Productnaam"
                />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{editForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Beschrijving</Label>
                <Textarea
                  id="description"
                  {...editForm.register("description")}
                  rows={3}
                  placeholder="Productbeschrijving"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="brand">Merk</Label>
                  <Input
                    id="brand"
                    {...editForm.register("brand")}
                    placeholder="Merk"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => editForm.setValue("status", value)} value={editForm.watch("status")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beschikbaar">Beschikbaar</SelectItem>
                      <SelectItem value="uitgeleend">Uitgeleend</SelectItem>
                      <SelectItem value="in_reparatie">In Reparatie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="material">Hoofdmateriaal</Label>
                <Select 
                  onValueChange={(value) => {
                    editForm.setValue("material", value);
                    handleMaterialChange(value);
                  }} 
                  value={editForm.watch("material") || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer materiaal" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material, index) => (
                      <SelectItem key={index} value={material.Materiaal}>
                        {material.Materiaal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500 mt-1">
                  Wasinstructies worden automatisch ingevuld op basis van materiaal
                </div>
              </div>

              <div>
                <Label htmlFor="collection">Collectie</Label>
                <Input
                  id="collection"
                  {...editForm.register("collection")}
                  placeholder="Bijv. Winter 2024, Sportkleding"
                />
              </div>
            </div>

            {/* Sustainability Fields */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-lg flex items-center">
                <Leaf className="h-5 w-5 mr-2 text-green-600" />
                Duurzaamheid & Herkomst
              </h3>

              <div>
                <Label htmlFor="story">Productverhaal</Label>
                <Textarea
                  id="story"
                  {...editForm.register("story")}
                  rows={3}
                  placeholder="Vertel het verhaal achter dit product..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="origin">Herkomst</Label>
                  <Input
                    id="origin"
                    {...editForm.register("origin")}
                    placeholder="Bijv. Nederland, Bangladesh"
                  />
                </div>
                <div>
                  <Label htmlFor="co2Footprint">CO2 Voetafdruk</Label>
                  <Input
                    id="co2Footprint"
                    {...editForm.register("co2Footprint")}
                    placeholder="Bijv. 5.2 kg CO2eq"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="washingInstructions">Wasinstructies</Label>
                <Textarea
                  id="washingInstructions"
                  {...editForm.register("washingInstructions")}
                  rows={2}
                  placeholder="Wasvoorschriften en verzorgingsinstructies..."
                />
              </div>

              <div>
                <Label htmlFor="esgScore">ESG/CSRD Score</Label>
                <Input
                  id="esgScore"
                  {...editForm.register("esgScore")}
                  placeholder="Bijv. A+, 85/100, Goud"
                />
              </div>
            </div>

            {/* Material Properties */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-lg">Materiaaleigenschappen</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="materialComposition" className="text-xs">Samenstelling</Label>
                  <Input
                    id="materialComposition"
                    {...editForm.register("materialComposition")}
                    placeholder="100% Katoen"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="materialWeight" className="text-xs">Gewicht</Label>
                  <Input
                    id="materialWeight"
                    {...editForm.register("materialWeight")}
                    placeholder="250g/m²"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="materialDurability" className="text-xs">Duurzaamheid</Label>
                  <Input
                    id="materialDurability"
                    {...editForm.register("materialDurability")}
                    placeholder="Hoog, Gemiddeld, Laag"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="materialRecyclability" className="text-xs">Recycleerbaarheid</Label>
                  <Input
                    id="materialRecyclability"
                    {...editForm.register("materialRecyclability")}
                    placeholder="100% Recycleerbaar"
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="materialCertifications" className="text-xs">Certificeringen</Label>
                <Input
                  id="materialCertifications"
                  {...editForm.register("materialCertifications")}
                  placeholder="GOTS, OEKO-TEX, Cradle to Cradle"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Product foto toevoegen</Label>
              
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Foto preview" 
                    className="w-full h-40 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                  <div className="space-y-2">
                    <div className="text-gray-500 text-sm">
                      Klik om een foto toe te voegen
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(false)}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gwc-primary hover:bg-gwc-primary/90 text-white"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Opslaan
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <div>
            {/* Basic Info - View Mode */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-medium mb-2">{product.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Tag className="h-4 w-4 mr-1" />
                      {product.type}
                    </span>
                    <span className="flex items-center">
                      <QrCode className="h-4 w-4 mr-1" />
                      {product.gtin}
                    </span>
                  </div>
                </div>
                {getStatusBadge(product.status)}
              </div>
              
              {product.description && (
                <p className="text-gray-700 mb-4">{product.description}</p>
              )}

              {product.brand && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-500">Merk: </span>
                  <span className="text-sm">{product.brand}</span>
                </div>
              )}

              {product.collection && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-500">Collectie: </span>
                  <span className="text-sm">{product.collection}</span>
                </div>
              )}
            </div>

            {/* Product Story */}
            {product.story && (
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2 flex items-center text-blue-700">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M5,19V5H19V19H5Z"/>
                    </svg>
                    Productverhaal
                  </h3>
                  <p className="text-sm text-gray-700">{product.story}</p>
                </CardContent>
              </Card>
            )}

            {/* Sustainability Info */}
            {(product.origin || product.co2Footprint || product.esgScore || product.washingInstructions) && (
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3 flex items-center text-green-700">
                    <Leaf className="h-5 w-5 mr-2" />
                    Duurzaamheid & Herkomst
                  </h3>
                  <div className="space-y-2">
                    {product.origin && (
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-green-600" />
                        <span className="text-sm font-medium text-gray-500 mr-2">Herkomst:</span>
                        <span className="text-sm">{product.origin}</span>
                      </div>
                    )}
                    {product.co2Footprint && (
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-500 mr-2">CO2 Voetafdruk:</span>
                        <span className="text-sm">{product.co2Footprint}</span>
                      </div>
                    )}
                    {product.esgScore && (
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-500 mr-2">ESG Score:</span>
                        <span className="text-sm">{product.esgScore}</span>
                      </div>
                    )}
                    {product.washingInstructions && (
                      <div className="mt-3">
                        <div className="flex items-center mb-1">
                          <Droplets className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Wasinstructies:</span>
                        </div>
                        <p className="text-sm text-gray-600 ml-6">{product.washingInstructions}</p>
                        
                        {/* Care symbols based on material */}
                        {product.material && careInstructions && (
                          <div className="ml-6 mt-2">
                            <span className="text-xs font-medium text-gray-500 block mb-1">Verzorgingssymbolen:</span>
                            <div className="flex space-x-3 text-lg">
                              <span title={careInstructions.washing.instruction}>
                                {careInstructions.washing.symbol}
                              </span>
                              <span title={careInstructions.drying.instruction}>
                                {careInstructions.drying.symbol}
                              </span>
                              <span title={careInstructions.ironing.instruction}>
                                {careInstructions.ironing.symbol}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Material Properties */}
            {product.materialProperties && Object.keys(product.materialProperties).some(key => product.materialProperties![key as keyof typeof product.materialProperties]) && (
              <Card className="bg-orange-50">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3 text-orange-700">Materiaaleigenschappen</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {product.materialProperties.composition && (
                      <div>
                        <span className="font-medium text-gray-500">Samenstelling:</span>
                        <p className="text-gray-700">{product.materialProperties.composition}</p>
                      </div>
                    )}
                    {product.materialProperties.weight && (
                      <div>
                        <span className="font-medium text-gray-500">Gewicht:</span>
                        <p className="text-gray-700">{product.materialProperties.weight}</p>
                      </div>
                    )}
                    {product.materialProperties.durability && (
                      <div>
                        <span className="font-medium text-gray-500">Duurzaamheid:</span>
                        <p className="text-gray-700">{product.materialProperties.durability}</p>
                      </div>
                    )}
                    {product.materialProperties.recyclability && (
                      <div>
                        <span className="font-medium text-gray-500">Recycleerbaarheid:</span>
                        <p className="text-gray-700">{product.materialProperties.recyclability}</p>
                      </div>
                    )}
                  </div>
                  {product.materialProperties.certifications && product.materialProperties.certifications.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <span className="font-medium text-gray-500 text-sm">Certificeringen:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.materialProperties.certifications.map((cert, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

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

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Camera, QrCode, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
});

type FormData = z.infer<typeof formSchema>;

export default function AddProduct() {
  const [location, setLocation] = useLocation();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [inputSources, setInputSources] = useState<string[]>([]);
  const [newInputSource, setNewInputSource] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gtin: prefilledGtin,
      type: "",
      status: "beschikbaar",
      sourceGtins: [],
      additionalPhotos: [],
    },
  });

  // Update GTIN field when prefilledGtin changes
  useEffect(() => {
    console.log('Prefilled GTIN from URL:', prefilledGtin);
    if (prefilledGtin) {
      setValue("gtin", prefilledGtin);
    }
  }, [prefilledGtin, setValue]);

  const productType = watch("type");

  const createProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === "photo" || key === "sourceGtinsInput") return;
        if (key === "sourceGtins") {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add photo if selected
      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      const response = await apiRequest("POST", "/api/products", undefined);
      return response.json();
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

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalPhotosSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setAdditionalPhotos(prev => [...prev, ...files]);
    }
  };

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addInputSource = () => {
    if (newInputSource.trim() && !inputSources.includes(newInputSource.trim())) {
      const updatedSources = [...inputSources, newInputSource.trim()];
      setInputSources(updatedSources);
      setValue("sourceGtins", updatedSources);
      setNewInputSource("");
    }
  };

  const removeInputSource = (index: number) => {
    const updatedSources = inputSources.filter((_, i) => i !== index);
    setInputSources(updatedSources);
    setValue("sourceGtins", updatedSources);
  };

  const onSubmit = (data: FormData) => {
    // Process material properties into the correct format
    const materialProperties = {
      composition: data.materialComposition || undefined,
      weight: data.materialWeight || undefined,
      durability: data.materialDurability || undefined,
      recyclability: data.materialRecyclability || undefined,
      certifications: data.materialCertifications ? data.materialCertifications.split(',').map(c => c.trim()).filter(c => c) : undefined,
    };

    const submitData = {
      ...data,
      sourceGtins: inputSources,
      materialProperties: Object.keys(materialProperties).some(key => materialProperties[key as keyof typeof materialProperties]) 
        ? materialProperties 
        : undefined,
    };
    
    // Remove the individual material property fields since they're now in materialProperties
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

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium">Nieuw Product</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          {/* Additional Photos */}
          <div>
            <Label className="block text-sm font-medium mb-2">Extra foto's</Label>
            <div className="space-y-2">
              {/* Additional photos preview */}
              {additionalPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {additionalPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`Extra foto ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => removeAdditionalPhoto(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add more photos button */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 flex items-center justify-center bg-gray-50 relative">
                <div className="text-center">
                  <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Voeg extra foto's toe</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalPhotosSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Product Name */}
          <div>
            <Label htmlFor="name">Productnaam *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Bijv. Blauwe winterjas"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Brand */}
          <div>
            <Label htmlFor="brand">Merk</Label>
            <Input
              id="brand"
              {...register("brand")}
              placeholder="Bijv. Nike, H&M, Patagonia"
            />
          </div>

          {/* Product Type */}
          <div>
            <Label htmlFor="type">Type *</Label>
            <Select onValueChange={(value) => setValue("type", value)}>
              <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecteer type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kledingstuk">Kledingstuk</SelectItem>
                <SelectItem value="materiaal">Materiaalbatch</SelectItem>
                <SelectItem value="remake">Remake Artikel</SelectItem>
                <SelectItem value="overig">Overig</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* GTIN */}
          <div>
            <Label htmlFor="gtin">GTIN Code *</Label>
            <div className="flex space-x-2">
              <Input
                id="gtin"
                {...register("gtin")}
                value={watch("gtin") || ""}
                placeholder="8720796166279"
                className={`flex-1 ${errors.gtin ? "border-red-500" : ""}`}
                onChange={(e) => setValue("gtin", e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                className="bg-gwc-secondary text-white hover:bg-gwc-secondary/90"
                onClick={() => setLocation("/scanner")}
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            {errors.gtin && (
              <p className="text-sm text-red-500 mt-1">{errors.gtin.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Omschrijving</Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={3}
              placeholder="Korte omschrijving van het product..."
            />
          </div>

          {/* Collection */}
          <div>
            <Label htmlFor="collection">Collectie</Label>
            <Input
              id="collection"
              {...register("collection")}
              placeholder="Bijv. Winter 2024, Sportkleding"
            />
          </div>

          {/* Material */}
          <div>
            <Label htmlFor="material">Hoofdmateriaal</Label>
            <Input
              id="material"
              {...register("material")}
              placeholder="Bijv. 80% Gerecycled Polyester, 20% Katoen"
            />
          </div>

          {/* Product Story */}
          <div>
            <Label htmlFor="story">Productverhaal</Label>
            <Textarea
              id="story"
              {...register("story")}
              rows={3}
              placeholder="Vertel het verhaal achter dit product..."
            />
          </div>

          {/* Origin */}
          <div>
            <Label htmlFor="origin">Herkomst</Label>
            <Input
              id="origin"
              {...register("origin")}
              placeholder="Bijv. Nederland, Bangladesh, Italië"
            />
          </div>

          {/* Washing Instructions */}
          <div>
            <Label htmlFor="washingInstructions">Wasinstructies</Label>
            <Textarea
              id="washingInstructions"
              {...register("washingInstructions")}
              rows={2}
              placeholder="Wasvoorschriften en verzorgingsinstructies..."
            />
          </div>

          {/* CO2 Footprint */}
          <div>
            <Label htmlFor="co2Footprint">CO2 Voetafdruk</Label>
            <Input
              id="co2Footprint"
              {...register("co2Footprint")}
              placeholder="Bijv. 5.2 kg CO2eq"
            />
          </div>

          {/* ESG Score */}
          <div>
            <Label htmlFor="esgScore">ESG/CSRD Score</Label>
            <Input
              id="esgScore"
              {...register("esgScore")}
              placeholder="Bijv. A+, 85/100, Goud"
            />
          </div>

          {/* Material Properties */}
          <div className="space-y-3">
            <Label className="block text-sm font-medium">Materiaaleigenschappen</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="materialComposition" className="text-xs">Samenstelling</Label>
                <Input
                  id="materialComposition"
                  {...register("materialComposition")}
                  placeholder="100% Katoen"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="materialWeight" className="text-xs">Gewicht</Label>
                <Input
                  id="materialWeight"
                  {...register("materialWeight")}
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
                  {...register("materialDurability")}
                  placeholder="Hoog, Gemiddeld, Laag"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="materialRecyclability" className="text-xs">Recycleerbaarheid</Label>
                <Input
                  id="materialRecyclability"
                  {...register("materialRecyclability")}
                  placeholder="100% Recycleerbaar"
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="materialCertifications" className="text-xs">Certificeringen</Label>
              <Input
                id="materialCertifications"
                {...register("materialCertifications")}
                placeholder="GOTS, OEKO-TEX, Cradle to Cradle"
                className="text-sm"
              />
            </div>
          </div>

          {/* Input Sources (for remakes/batches) */}
          {(productType === "remake" || productType === "materiaal") && (
            <div>
              <Label className="block text-sm font-medium mb-2">Input Bronnen</Label>
              <div className="space-y-2">
                {/* Existing sources */}
                {inputSources.map((source, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input value={source} readOnly className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeInputSource(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Add new source */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="GTIN van bron product"
                    value={newInputSource}
                    onChange={(e) => setNewInputSource(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInputSource();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/scanner")}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gwc-primary text-sm flex items-center"
                  onClick={addInputSource}
                  disabled={!newInputSource.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Voeg bron toe
                </Button>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setLocation("/")}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gwc-primary hover:bg-gwc-primary/90 text-white"
              disabled={createProductMutation.isPending}
            >
              {createProductMutation.isPending ? "Aanmaken..." : "Product Aanmaken"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
